const { BotPlugin } = require("strange-sdk");
const { LavalinkManager } = require("lavalink-client");

class MusicPlugin extends BotPlugin {
    constructor() {
        super({
            dependencies: [],
            baseDir: __dirname,
        });
        this.music = null; // Se inicializará en initialize
    }

    /**
     * @param {import('discord.js').Client} client
     */
    async initialize(client) {
        console.log("[MUSIC-LOG] Iniciando MusicPlugin...");

        this.music = new LavalinkManager({
            nodes: [
                {
                    host: process.env.LAVALINK_HOST || "lavalink.jirayu.net",
                    port: parseInt(process.env.LAVALINK_PORT) || 13592,
                    password: process.env.LAVALINK_PASSWORD || "youshallnotpass",
                    secure: false,
                }
            ],
            sendToShard: (guildId, payload) => {
                const guild = client.guilds.cache.get(guildId);
                if (guild) guild.shard.send(payload);
            }
        });

        // Adjuntamos al cliente para que otros plugins o comandos lo vean
        client.music = this.music;

        // Eventos básicos de Lavalink
        this.music.on("nodeConnect", (node) => {
            console.log(`[MUSIC-LOG] ✅ Nodo Lavalink conectado: ${node.options.host}`);
        });

        this.music.on("nodeError", (node, error) => {
            console.log(`[MUSIC-LOG] ❌ Error en nodo Lavalink: ${error.message}`);
        });

        this.music.on("trackStart", (player, track) => {
            const channel = client.channels.cache.get(player.textChannelId);
            if (channel) channel.send(`🎶 Reproduciendo ahora: **${track.info.title}**`);
        });

        // Necesario para procesar los cambios de estado de voz
        client.on("raw", (d) => this.music.sendRawData(d));

        try {
            await this.music.init(client.user.id);
            console.log("[MUSIC-LOG] 🎵 LavalinkManager inicializado correctamente.");
        } catch (err) {
            console.error("[MUSIC-LOG] ❌ Error al inicializar LavalinkManager:", err);
        }
    }
}

// IMPORTANTE: Exportamos la instancia
const musicPlugin = new MusicPlugin();
module.exports = musicPlugin;