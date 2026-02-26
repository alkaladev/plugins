const { BotPlugin } = require("strange-sdk");
const db = require("../db.service");
const { Logger } = require("strange-sdk/utils");
const { LavalinkManager } = require("lavalink-client");
const axios = require("axios");

class MusicPlugin extends BotPlugin {
    constructor() {
        super({
            dependencies: [],
            baseDir: __dirname,
        });
        this.music = null;
        this.initialized = false;
        this._client = null;

        this.eventHandlers.set("ready", this.onReady.bind(this));
        this.ipcEvents = new Map();

        this.ipcEvents.set("getStatus", async (payload) => {
            return await this.handleGetStatus(payload);
        });

        this.ipcEvents.set("control", async (payload) => {
            return await this.handleControl(payload);
        });

        this.ipcEvents.set("search", async (payload) => {
            try {
                return await this.handleSearch(payload);
            } catch (error) {
                console.error('[MUSIC-IPC-EVENT] search ERROR:', error);
                throw error;
            }
        });

        // ── DB-backed history & top ──
        this.ipcEvents.set("getHistory", async (payload) => {
            const history = await db.getHistory(payload.guildId, 20);
            return { history };
        });

        this.ipcEvents.set("getTopTracks", async (payload) => {
            const top = await db.getTopTracks(payload.guildId, 5);
            return { top };
        });

        // ── Playlists & artists config ──
        this.ipcEvents.set("getPinnedPlaylists", async ({ guildId }) => {
            return { playlists: await db.getPinnedPlaylists(guildId) };
        });
        this.ipcEvents.set("upsertPinnedPlaylist", async ({ guildId, data }) => {
            return { playlist: await db.upsertPinnedPlaylist(guildId, data) };
        });
        this.ipcEvents.set("deletePinnedPlaylist", async ({ guildId, id }) => {
            await db.deletePinnedPlaylist(guildId, id); return { ok: true };
        });
        this.ipcEvents.set("reorderPinnedPlaylists", async ({ guildId, orderedIds }) => {
            await db.reorderPinnedPlaylists(guildId, orderedIds); return { ok: true };
        });

        this.ipcEvents.set("getPinnedArtists", async ({ guildId }) => {
            return { artists: await db.getPinnedArtists(guildId) };
        });
        this.ipcEvents.set("upsertPinnedArtist", async ({ guildId, data }) => {
            return { artist: await db.upsertPinnedArtist(guildId, data) };
        });
        this.ipcEvents.set("deletePinnedArtist", async ({ guildId, id }) => {
            await db.deletePinnedArtist(guildId, id); return { ok: true };
        });

        // ── Voice channel listing ──
        this.ipcEvents.set("getVoiceChannels", async ({ guildId }) => {
            const guild = this._client?.guilds?.cache?.get(guildId);
            if (!guild) return { channels: [] };
            const channels = guild.channels.cache
                .filter(c => c.type === 2)
                .map(c => ({ id: c.id, name: c.name, memberCount: c.members?.size || 0 }))
                .sort((a, b) => a.name.localeCompare(b.name));
            return { channels };
        });

        // ── Join channel and play query ──
        this.ipcEvents.set("joinAndPlay", async ({ guildId, channelId, query }) => {
            const guild = this._client?.guilds?.cache?.get(guildId);
            if (!guild) throw new Error("Servidor no encontrado");
            let player = this.music?.players?.get(guildId);
            if (!player) {
                player = await this.music.createPlayer({
                    guildId, voiceChannelId: channelId, textChannelId: null,
                    selfDeaf: true, selfMute: false, volume: 80,
                });
            }
            if (!player.connected) await player.connect();
            const result = await player.search(query, { source: "spsearch" });
            if (!result?.tracks?.length) throw new Error("No se encontraron canciones");
            const tracks = result.tracks.slice(0, 20);
            player.queue.add(tracks);
            if (!player.playing && !player.paused) await player.play();
            return { success: true, added: tracks.length };
        });
    }

    getPlayer(guildId) {
        return this.music?.players.get(guildId);
    }

    /**
     * 🟢 HANDLER IPC: Búsqueda de canciones (LAVALINK 2.9+)
     */
    async handleSearch(payload) {
        const requestId = `REQ-SEARCH-${Date.now()}`;
        const startTotal = Date.now();
        
        //console.log(`\n[MUSIC-SEARCH-IPC] ============ INICIO SEARCH: ${requestId} ============`);
        //console.log(`[MUSIC-SEARCH-IPC-${requestId}] Payload recibido:`, payload);
        
        try {
            const { guildId, query, page = 1 } = payload;

            if (!query || query.trim().length === 0) {
                console.log(`[MUSIC-SEARCH-IPC-${requestId}] Query vacío`);
                return {
                    tracks: [],
                    query: query
                };
            }
            const player = this.getPlayer(guildId);
            if (!player) {
                return {
                    tracks: [],
                    query: query
                };
            }

            const startSearch = Date.now();
            const searchResult = await player.search(query, { source: "spsearch" });

            const searchTime = Date.now() - startSearch;
            console.log(`[MUSIC-SEARCH-IPC-${requestId}] Búsqueda completada en: ${searchTime}ms`);
            console.log(`[MUSIC-SEARCH-IPC-${requestId}] searchResult.tracks.length:`, searchResult?.tracks?.length || 0);

            if (!searchResult || !searchResult.tracks || searchResult.tracks.length === 0) {
                return {
                    tracks: [],
                    query: query
                };
            }

            const totalTime = Date.now() - startTotal;
            console.log(`[MUSIC-SEARCH-IPC-${requestId}] ✅ ÉXITO - ${searchResult.tracks.length} resultados - TOTAL TIME: ${totalTime}ms`);
            console.log(`[MUSIC-SEARCH-IPC] ============ FIN SEARCH: ${requestId} ============\n`);

            // 🔧 RETORNAR SOLO LOS DATOS, SIN ENVOLTURA EXTRA
            return {
                tracks: searchResult.tracks,
                query: query
            };

        } catch (error) {
            const totalTime = Date.now() - startTotal;
            console.error(`[MUSIC-SEARCH-IPC-${requestId}] ❌ ERROR:`, error.message);
            console.log(`[MUSIC-SEARCH-IPC] ============ FIN SEARCH (CON ERROR): ${requestId} ============\n`);
            throw error;
        }
    }

    /**
     * Lógica centralizada de acciones
     */
    async handleWebAction(guildId, action, data = {}) {
        const player = this.getPlayer(guildId);
        if (!player) throw new Error("No hay un reproductor activo en este servidor.");

        switch (action) {
            case "music:TOGGLE_PAUSE":
                try {                   
                    if (!player.queue?.current) {
                        throw new Error('No hay canción para pausar/reanudar');
                    }
                    
                    const currentPausedState = player.paused;
                    
                    if (currentPausedState) {
                        try {
                            await player.resume();
                            console.log('[MUSIC-ACTION] - resume() ejecutado correctamente');
                        } catch (resumeErr) {
                            console.error('[MUSIC-ACTION] - resume() error:', resumeErr.message);
                            try {
                                await player.pause(false);
                                console.log('[MUSIC-ACTION] - pause(false) ejecutado correctamente');
                            } catch (pauseErr) {
                                console.error('[MUSIC-ACTION] - pause(false) también falló:', pauseErr.message);
                            }
                        }
                    } else {
                        try {
                            await player.pause(true);
                        } catch (pauseErr) {
                        }
                    }
                    
                    console.log('[MUSIC-ACTION] - player.paused después:', player.paused);
                    
                    // Retornar el estado ACTUAL
                    return { 
                        success: true, 
                        paused: player.paused,
                        message: player.paused ? 'Pausado' : 'Reproduciéndose'
                    };
                    
                } catch (err) {
                    console.error('[MUSIC-ACTION] TOGGLE_PAUSE ERROR:', err.message);
                    
                    // Retornar estado actual
                    return { 
                        success: true, 
                        paused: player.paused,
                        message: 'Error: ' + err.message
                    };
                }
            case "music:SKIP_TRACK": 
                await player.skip();
                return { success: true, message: 'Canción saltada' };
            case "music:STOP_PLAYER": 
                await player.destroy();
                return { success: true, message: 'Reproductor detenido' };
            case "music:SET_VOLUME": 
                const vol = parseInt(data.volume);
                if (isNaN(vol)) throw new Error("Volumen inválido");
                await player.setVolume(vol);
                return { success: true, volume: vol };
            case "music:ADD_QUEUE":
                return await this.addToQueue(guildId, data.track);
            default: 
                throw new Error(`Acción no reconocida: ${action}`);
        }
    }

    /**
     * Agregar canción a la cola
     */
    async addToQueue(guildId, trackData) {
        const player = this.getPlayer(guildId);
        if (!player) {
            throw new Error("No hay un reproductor activo en este servidor.");
        }

        if (!trackData) {
            throw new Error("Datos de track no proporcionados.");
        }

        try {
            console.log('[MUSIC-ADD-QUEUE] Agregando track:', trackData.title);

            let trackToAdd;

            // Si tenemos el URI, buscamos especificamente ese track
            if (trackData.uri) {
                const searchResult = await player.search(trackData.uri, { source: "spsearch" });
                
                if (searchResult?.tracks && searchResult.tracks.length > 0) {
                    trackToAdd = searchResult.tracks[0];
                }
            }

            // Si no encontramos por URI o no tenemos, buscamos por título + artista
            if (!trackToAdd) {
                const query = `${trackData.title} ${trackData.author || ''}`.trim();
                const searchResult = await player.search(query, { source: "spsearch" });
                
                if (searchResult?.tracks && searchResult.tracks.length > 0) {
                    trackToAdd = searchResult.tracks[0];
                    console.log('[MUSIC-ADD-QUEUE] Track encontrado por query:', trackToAdd.info.title);
                }
            }

            if (!trackToAdd) {
                throw new Error(`No se encontró la canción: ${trackData.title}`);
            }

            // Agregar a la cola
            player.queue.add(trackToAdd);

            // Si no hay nada reproduciendo, reproducir
            if (!player.queue.current && !player.playing) {
                await player.play();
            }

            return {
                success: true,
                track: {
                    title: trackToAdd.info.title,
                    author: trackToAdd.info.author,
                    uri: trackToAdd.info.uri
                }
            };

        } catch (error) {
            console.error('[MUSIC-ADD-QUEUE] Error:', error);
            throw new Error(`Error al agregar canción a la cola: ${error.message}`);
        }
    }

    /**
     * 🟢 HANDLER IPC: Obtener status de música
     */
    async handleGetStatus(payload) {
        try {
            const { guildId } = payload;

            const player = this.getPlayer(guildId);

            if (!player || !player.connected) {
                return {
                    active: false,
                    paused: false,
                    volume: 0,
                    current: null,
                    queue: []
                };
            }

            const queue = player.queue;
            const current = queue?.current;

            return {
                active: !!current,
                paused: player.paused || false,
                volume: player.volume || 0,
                position: player.position || 0,
                current: current ? {
                    title: current.info?.title || 'Unknown',
                    author: current.info?.author || 'Unknown',
                    artwork: current.info?.artworkUrl || 
                            current.info?.thumbnail ||
                            current.info?.image ||
                            current.info?.iconUrl ||
                            '',
                    uri: current.info?.uri || '',
                    duration: current.info?.duration || 0
                } : null,
                queue: (player.queue?.tracks || [])
                    .slice(0, 10)
                    .map((t) => ({
                        title: t.info?.title || 'Unknown',
                        author: t.info?.author || 'Unknown'
                    }))
            };

        } catch (error) {
            console.error('[MUSIC-IPC] Error en handleGetStatus:', error);
            throw error;
        }
    }

    /**
     * 🟢 HANDLER IPC: Control de música
     */
    async handleControl(payload) {
        const { guildId, event, data = {} } = payload;        
        // Validar que data sea un objeto limpio sin funciones
        let cleanData = {};
        if (data && typeof data === 'object') {
            for (const key in data) {
                if (typeof data[key] !== 'function') {
                    cleanData[key] = data[key];
                }
            }
        }
        
        console.log('[MUSIC-CONTROL-IPC] cleanData:', cleanData);
        
        try {
            const result = await this.handleWebAction(guildId, event, cleanData);
            console.log('[MUSIC-CONTROL-IPC] ✅ Action completed:', result);
            return { 
                success: true,
                data: result
            };
        } catch (error) {
            console.error('[MUSIC-CONTROL-IPC] ❌ Error:', error.message);
            Logger.error(`[MUSIC-IPC] Error: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async onReady(client) {
        this._client = client;

        // Inicializar DBService manualmente — el SDK solo lo hace si se pasa
        // dbService al constructor, pero el check instanceof falla en pnpm workspaces.
        const { DBClient } = require("strange-db-client");
        if (!db.dbClient) {
            await db.init(DBClient.getInstance());
        }

        // El SDK resetea this.ipcEvents en enable() -> #loadEvents() porque
        // no existe la carpeta bot/events/ipc/. Los re-registramos aquí.
        this.ipcEvents.set("getHistory", async (payload) => {
            const history = await db.getHistory(payload.guildId, 20);
            return { history };
        });
        this.ipcEvents.set("getTopTracks", async (payload) => {
            const top = await db.getTopTracks(payload.guildId, 5);
            return { top };
        });
        this.ipcEvents.set("getPinnedPlaylists", async ({ guildId }) => {
            return { playlists: await db.getPinnedPlaylists(guildId) };
        });
        this.ipcEvents.set("upsertPinnedPlaylist", async ({ guildId, data }) => {
            return { playlist: await db.upsertPinnedPlaylist(guildId, data) };
        });
        this.ipcEvents.set("deletePinnedPlaylist", async ({ guildId, id }) => {
            await db.deletePinnedPlaylist(guildId, id); return { ok: true };
        });
        this.ipcEvents.set("reorderPinnedPlaylists", async ({ guildId, orderedIds }) => {
            await db.reorderPinnedPlaylists(guildId, orderedIds); return { ok: true };
        });
        this.ipcEvents.set("getPinnedArtists", async ({ guildId }) => {
            return { artists: await db.getPinnedArtists(guildId) };
        });
        this.ipcEvents.set("upsertPinnedArtist", async ({ guildId, data }) => {
            return { artist: await db.upsertPinnedArtist(guildId, data) };
        });
        this.ipcEvents.set("deletePinnedArtist", async ({ guildId, id }) => {
            await db.deletePinnedArtist(guildId, id); return { ok: true };
        });
        // getStatus, control, search, getVoiceChannels, joinAndPlay ya estaban
        // en el constructor — los re-registramos también para que no se pierdan
        this.ipcEvents.set("getStatus", async (payload) => {
            return await this.handleGetStatus(payload);
        });
        this.ipcEvents.set("control", async (payload) => {
            return await this.handleControl(payload);
        });
        this.ipcEvents.set("search", async (payload) => {
            try {
                return await this.handleSearch(payload);
            } catch (error) {
                console.error('[MUSIC-IPC-EVENT] search ERROR:', error);
                throw error;
            }
        });
        this.ipcEvents.set("getVoiceChannels", async ({ guildId }) => {
            const guild = this._client?.guilds?.cache?.get(guildId);
            if (!guild) return { channels: [] };
            const channels = guild.channels.cache
                .filter(c => c.type === 2)
                .map(c => ({ id: c.id, name: c.name, memberCount: c.members?.size || 0 }))
                .sort((a, b) => a.name.localeCompare(b.name));
            return { channels };
        });
        this.ipcEvents.set("joinAndPlay", async ({ guildId, channelId, query }) => {
            const guild = this._client?.guilds?.cache?.get(guildId);
            if (!guild) throw new Error("Servidor no encontrado");
            let player = this.music?.players?.get(guildId);
            if (!player) {
                player = await this.music.createPlayer({
                    guildId, voiceChannelId: channelId, textChannelId: null,
                    selfDeaf: true, selfMute: false, volume: 80,
                });
            }
            if (!player.connected) await player.connect();
            const result = await player.search(query, { source: "spsearch" });
            if (!result?.tracks?.length) throw new Error("No se encontraron canciones");
            const tracks = result.tracks.slice(0, 20);
            player.queue.add(tracks);
            if (!player.playing && !player.paused) await player.play();
            return { success: true, added: tracks.length };
        });

        await this._initializeMusic(client);
    }

    async _initializeMusic(client) {
        if (this.initialized) return;
        if (!client?.user?.id) return;

        this.initialized = true;

        try {
            const HOST = process.env.LAVALINK_HOST || "lavalink.jirayu.net";
            const PORT = parseInt(process.env.LAVALINK_PORT) || 2333; // 🔧 LAVALINK 2.9+: Puerto por defecto es 2333
            const PASS = process.env.LAVALINK_PASSWORD || "youshallnotpass";

            this.music = new LavalinkManager({
                nodes: [{
                    id: "main-node",
                    host: HOST,
                    port: PORT,
                    password: PASS,
                    authorization: PASS,
                    secure: false,
                    retryAmount: 5,
                    retryDelay: 5000,
                }],
                client: { id: client.user.id, username: client.user.username },
                sendToShard: (guildId, payload) => {
                    const guild = client.guilds.cache.get(guildId);
                    if (guild) guild.shard.send(payload);
                },
                autoSkip: true,
                playerOptions: {
                    clientBasedPositionUpdateInterval: 150,
                    defaultSearchPlatform: "ytsearch",
                    // 🔧 LAVALINK 2.9+: Configuración recomendada
                    applySearchIfNeeded: true, 
                    onUndeclaredResponsetype: "ignore" 
                },
                // 🔧 LAVALINK 2.9+: Configuración de búsqueda
                searchOptions: {
                    allowedSearchSources: ["ytsearch", "ytmsearch", "scsearch", "spsearch"],
                }
            });

            client.music = this.music;

            client.music.updateVoiceStatus = async (channelId, status = "") => {
                if (!channelId) return;
                try {
                    await axios.put(
                        `https://discord.com/api/v10/channels/${channelId}/voice-status`,
                        { status: status },
                        {
                            headers: {
                                Authorization: `Bot ${client.token}`,
                                "Content-Type": "application/json",
                            },
                        }
                    );
                } catch (err) {}
            };

            this.music.on("trackStart", async (player, track) => {
                player.lastVoiceChannelId = player.voiceChannelId;
                const statusText = `Sonando Ahora **${track.info.title}**`.substring(0, 50);
                await client.music.updateVoiceStatus(player.voiceChannelId, statusText);
                Logger.info(`[MUSIC] Reproduciendo: ${track.info.title}`);
                // 📜 Persistir en base de datos
                const entry = {
                    title: track.info?.title || 'Unknown',
                    author: track.info?.author || 'Unknown',
                    artwork: track.info?.artworkUrl || '',
                    duration: track.info?.duration || 0,
                };
                db.addToHistory(player.guildId, entry).catch(() => {});
                db.incrementTopTrack(player.guildId, entry).catch(() => {});
            });

            const onPause = async (player) => {
                const track = player.queue.current;
                if (track) {
                    const statusText = `Pausado **${track.info.title}**`.substring(0, 50);
                    await client.music.updateVoiceStatus(player.voiceChannelId || player.lastVoiceChannelId, statusText);
                }
            };

            this.music.on("playerPause", onPause);
            this.music.on("trackPause", onPause);

            const onResume = async (player) => {
                const track = player.queue.current;
                if (track) {
                    const statusText = `Sonando Ahora **${track.info.title}**`.substring(0, 50);
                    await client.music.updateVoiceStatus(player.voiceChannelId || player.lastVoiceChannelId, statusText);
                }
            };

            this.music.on("playerResume", onResume);
            this.music.on("trackResume", onResume);

            const clearStatus = async (player) => {
                const channelId = player.voiceChannelId || player.lastVoiceChannelId;
                await client.music.updateVoiceStatus(channelId, "");
                Logger.info(`[MUSIC] Canal de voz limpiado en el servidor: ${player.guildId}`);
            };

            this.music.on("queueEnd", clearStatus);
            this.music.on("playerDestroy", clearStatus);

            client.on("raw", (d) => this.music.sendRawData(d));
            
            client.on("voiceStateUpdate", async (oldState, newState) => {
                if (oldState.id === client.user.id) {
                    if (!newState.channelId) {
                        await client.music.updateVoiceStatus(oldState.channelId, "");
                        const player = this.music.players.get(oldState.guild.id);
                        if (player) player.destroy();
                        Logger.warn(`[MUSIC] Bot desconectado del canal.`);
                    } 
                    else if (oldState.channelId !== newState.channelId) {
                        await client.music.updateVoiceStatus(oldState.channelId, "");
                    }

                    this.music.sendRawData({
                        op: "voiceStateUpdate",
                        d: {
                            guild_id: newState.guild.id,
                            channel_id: newState.channelId,
                            session_id: newState.sessionId,
                        }
                    });
                }
            });

            this.music.on("nodeConnect", (node) => Logger.success(`[MUSIC] Nodo conectado: ${node.options.host}`));
            this.music.on("nodeError", (node, error) => Logger.error(`[MUSIC] Error nodo: ${error.message}`));

            await this.music.init(client.user.id);
            Logger.success("[MUSIC] Sistema de música inicializado correctamente para Lavalink 2.9+");

        } catch (error) {
            Logger.error("[MUSIC] Fallo al inicializar plugin:", error);
            this.initialized = false;
        }
    }

    getManager() { return this.music; }

    async destroy() {
        if (this.music) await this.music.destroy();
    }
}

const musicPlugin = new MusicPlugin();
module.exports = musicPlugin;