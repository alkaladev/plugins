const { BotPlugin } = require("strange-sdk");
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
        
        // Registrar evento de inicialización
        this.eventHandlers.set("ready", this.onReady.bind(this));
        
        // 🟢 EVENTOS IPC
        this.ipcEvents = new Map();
        
        console.log('[MUSIC-PLUGIN] Constructor: inicializando ipcEvents...');
        
        this.ipcEvents.set("getStatus", async (payload) => {
            console.log('[MUSIC-IPC-EVENT] getStatus llamado con payload:', payload);
            return await this.handleGetStatus(payload);
        });

        this.ipcEvents.set("control", async (payload) => {
            console.log('[MUSIC-IPC-EVENT] control llamado con payload:', payload);
            return await this.handleControl(payload);
        });

        // ✅ NUEVO: Handler para búsqueda
        this.ipcEvents.set("search", async (payload) => {
            console.log('[MUSIC-IPC-EVENT] ¡¡SEARCH LLAMADO!! payload:', payload);
            try {
                const result = await this.handleSearch(payload);
                console.log('[MUSIC-IPC-EVENT] search completado, retornando:', result);
                return result;
            } catch (error) {
                console.error('[MUSIC-IPC-EVENT] search ERROR:', error);
                throw error;
            }
        });

        console.log('[MUSIC-PLUGIN] ipcEvents registrados:', Array.from(this.ipcEvents.keys()));
    }

    getPlayer(guildId) {
        return this.music?.players.get(guildId);
    }

    /**
     * 🟢 HANDLER IPC: Búsqueda de canciones
     */
    async handleSearch(payload) {
        const requestId = `REQ-SEARCH-${Date.now()}`;
        const startTotal = Date.now();
        
        console.log(`\n[MUSIC-SEARCH-IPC] ============ INICIO SEARCH: ${requestId} ============`);
        console.log(`[MUSIC-SEARCH-IPC-${requestId}] Payload recibido:`, payload);
        
        try {
            const { guildId, query, page = 1 } = payload;

            if (!query || query.trim().length === 0) {
                console.log(`[MUSIC-SEARCH-IPC-${requestId}] Query vacío`);
                return {
                    tracks: [],
                    query: query
                };
            }

            console.log(`[MUSIC-SEARCH-IPC-${requestId}] Buscando: "${query}" (página ${page})`);

            const player = this.getPlayer(guildId);
            console.log(`[MUSIC-SEARCH-IPC-${requestId}] Player existe: ${!!player}`);

            if (!player) {
                console.log(`[MUSIC-SEARCH-IPC-${requestId}] ⚠️ No hay player para guildId: ${guildId}`);
                console.log(`[MUSIC-SEARCH-IPC-${requestId}] Players disponibles:`, Array.from(this.music?.players?.keys() || []));
                return {
                    tracks: [],
                    query: query
                };
            }

            const startSearch = Date.now();
            console.log(`[MUSIC-SEARCH-IPC-${requestId}] Ejecutando player.search()...`);
            console.log(`[MUSIC-SEARCH-IPC-${requestId}] Player.search es function:`, typeof player.search === 'function');

            const searchResult = await player.search(query, { source: "youtube" });

            const searchTime = Date.now() - startSearch;
            console.log(`[MUSIC-SEARCH-IPC-${requestId}] Búsqueda completada en: ${searchTime}ms`);
            console.log(`[MUSIC-SEARCH-IPC-${requestId}] searchResult tipo:`, typeof searchResult);
            console.log(`[MUSIC-SEARCH-IPC-${requestId}] searchResult.tracks existe:`, !!searchResult?.tracks);
            console.log(`[MUSIC-SEARCH-IPC-${requestId}] searchResult.tracks.length:`, searchResult?.tracks?.length || 0);

            if (!searchResult || !searchResult.tracks || searchResult.tracks.length === 0) {
                console.log(`[MUSIC-SEARCH-IPC-${requestId}] Sin resultados para: "${query}"`);
                return {
                    tracks: [],
                    query: query
                };
            }

            const totalTime = Date.now() - startTotal;
            console.log(`[MUSIC-SEARCH-IPC-${requestId}] ✅ ÉXITO - ${searchResult.tracks.length} resultados - TOTAL TIME: ${totalTime}ms`);
            console.log(`[MUSIC-SEARCH-IPC] ============ FIN SEARCH: ${requestId} ============\n`);

            return {
                tracks: searchResult.tracks,
                query: query
            };

        } catch (error) {
            const totalTime = Date.now() - startTotal;
            console.error(`[MUSIC-SEARCH-IPC-${requestId}] ❌ ERROR:`, error);
            console.error(`[MUSIC-SEARCH-IPC-${requestId}] Error message:`, error.message);
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
                return await player.pause(!player.paused);
            case "music:SKIP_TRACK": 
                return await player.skip();
            case "music:STOP_PLAYER": 
                return await player.destroy();
            case "music:SET_VOLUME": 
                const vol = parseInt(data.volume);
                if (isNaN(vol)) throw new Error("Volumen inválido");
                return await player.setVolume(vol);
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
                console.log('[MUSIC-ADD-QUEUE] Buscando por URI:', trackData.uri);
                const searchResult = await player.search(trackData.uri, { source: "youtube" });
                
                if (searchResult?.tracks && searchResult.tracks.length > 0) {
                    trackToAdd = searchResult.tracks[0];
                    console.log('[MUSIC-ADD-QUEUE] Track encontrado por URI:', trackToAdd.info.title);
                }
            }

            // Si no encontramos por URI o no tenemos, buscamos por título + artista
            if (!trackToAdd) {
                const query = `${trackData.title} ${trackData.author || ''}`.trim();
                console.log('[MUSIC-ADD-QUEUE] Buscando por query:', query);
                const searchResult = await player.search(query, { source: "youtube" });
                
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
            console.log('[MUSIC-ADD-QUEUE] Track agregado a la cola:', trackToAdd.info.title);

            // Si no hay nada reproduciendo, reproducir
            if (!player.queue.current && !player.playing) {
                console.log('[MUSIC-ADD-QUEUE] Iniciando reproducción');
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
                current: current ? {
                    title: current.info?.title || 'Unknown',
                    author: current.info?.author || 'Unknown',
                    artwork: current.info?.artworkUrl || '',
                    uri: current.info?.uri || ''
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
        
        console.log('[MUSIC-CONTROL-IPC] ============ CONTROL LLAMADO ============');
        console.log('[MUSIC-CONTROL-IPC] guildId:', guildId);
        console.log('[MUSIC-CONTROL-IPC] event:', event);
        console.log('[MUSIC-CONTROL-IPC] data tipo:', typeof data);
        console.log('[MUSIC-CONTROL-IPC] data:', data);
        
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
        console.log('[MUSIC-PLUGIN] onReady llamado');
        await this._initializeMusic(client);
    }

    async _initializeMusic(client) {
        if (this.initialized) return;
        if (!client?.user?.id) return;

        this.initialized = true;

        try {
            const HOST = process.env.LAVALINK_HOST || "lavalink.jirayu.net";
            const PORT = parseInt(process.env.LAVALINK_PORT) || 13592;
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
                },
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
            Logger.success("[MUSIC] Sistema de música inicializado correctamente");

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