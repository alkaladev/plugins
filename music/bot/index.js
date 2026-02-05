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

        // Esto ayuda, pero no siempre es suficiente en Strange
        client.music = this.music;

        this.music.on("trackStart", (player, track) => {
            const channel = client.channels.cache.get(player.textChannelId);
            if (channel) channel.send(`🎶 Reproduciendo ahora: **${track.info.title}**`);
        });

        this.music.on("queueEnd", (player) => {
            const channel = client.channels.cache.get(player.textChannelId);
            if (channel) channel.send("Wait... ¡La cola se ha terminado!");
            player.destroy();
        });

        client.on("raw", (d) => this.music.sendRawData(d));

        await this.music.init(client.user.id);
        console.log("🎵 MusicPlugin: Lavalink conectado y listo.");
    }
}

// CREAMOS LA INSTANCIA ANTES
const musicPlugin = new MusicPlugin();
module.exports = musicPlugin;