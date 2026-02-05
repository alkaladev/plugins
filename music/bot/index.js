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

    // Definimos la misma lógica para los 3 nombres posibles
    async initialize(client) { await this.startMusic(client, "initialize"); }
    async onLoad(client) { await this.startMusic(client, "onLoad"); }
    async onLogin(client) { await this.startMusic(client, "onLogin"); }

    async startMusic(client, methodUsed) {
        if (this.music) return; // Evitar doble inicialización
        
        console.log(`[MUSIC-LOG] ¡Plugin detectado usando el método: ${methodUsed}!`);

        try {
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

            client.music = this.music;

            this.music.on("nodeConnect", (node) => console.log(`[MUSIC-LOG] ✅ Lavalink conectado: ${node.options.host}`));
            this.music.on("nodeError", (node, error) => console.log(`[MUSIC-LOG] ❌ Error Lavalink: ${error.message}`));

            client.on("raw", (d) => this.music.sendRawData(d));

            await this.music.init(client.user.id);
            console.log("[MUSIC-LOG] 🎵 Sistema de música LISTO y OPERATIVO.");

        } catch (error) {
            console.error("[MUSIC-LOG] ❌ Fallo al iniciar música:", error);
        }
    }
}

const musicPlugin = new MusicPlugin();
module.exports = musicPlugin;