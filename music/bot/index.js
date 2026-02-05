const { BotPlugin } = require("strange-sdk");
const { LavalinkManager } = require("lavalink-client");

class MusicPlugin extends BotPlugin {
    constructor() {
        super({
            dependencies: [],
            baseDir: __dirname,
        });
        this.music = null;
    }

    async initialize(client) {
        this.music = new LavalinkManager({
            nodes: [
                {
                    host: process.env.LAVALINK_HOST || "localhost",
                    port: parseInt(process.env.LAVALINK_PORT) || 2333,
                    password: process.env.LAVALINK_PASSWORD || "youshallnotpass",
                    secure: false,
                }
            ],
            sendToShard: (guildId, payload) => {
                const guild = client.guilds.cache.get(guildId);
                if (guild) guild.shard.send(payload);
            }
        });

        client.music = this.music;

        // --- MANEJO DE EVENTOS DE MÚSICA ---
        
        this.music.on("trackStart", (player, track) => {
            const channel = client.channels.cache.get(player.textChannelId);
            if (channel) {
                channel.send(`🎶 Reproduciendo ahora: **${track.info.title}**`);
            }
        });

        this.music.on("queueEnd", (player) => {
            const channel = client.channels.cache.get(player.textChannelId);
            if (channel) {
                channel.send("Wait... ¡La cola se ha terminado!");
            }
            player.destroy(); // Opcional: desconectar al terminar
        });

        // Importante para que Lavalink reciba los cambios de estado de voz
        client.on("raw", (d) => this.music.sendRawData(d));

        await this.music.init(client.user.id);
        console.log("🎵 MusicPlugin: Lavalink conectado y listo.");
    }
}

module.exports = new MusicPlugin();