const { BotPlugin } = require("strange-sdk");
const { LavalinkManager } = require("lavalink-client");

class MusicPlugin extends BotPlugin {
    constructor() {
        super({
            dependencies: [],
            baseDir: __dirname,
        });
        this.music = null;
        console.log("[MUSIC-LOG] Clase MusicPlugin cargada en el constructor.");
    }

    /**
     * Este es el método que el SDK de Strange llama al cargar el plugin.
     * Si no ves el log de "onLoad ejecutado", prueba a renombrar esta función a 'start' o 'initialize'.
     * @param {import('discord.js').Client} client
     */
    async onLoad(client) {
        console.log("[MUSIC-LOG] ¡Método onLoad detectado y ejecutado por el SDK!");

        try {
            this.music = new LavalinkManager({
                nodes: [
                    {
                        host: process.env.LAVALINK_HOST || "lavalink.jirayu.net",
                        port: parseInt(process.env.LAVALINK_PORT) || 13592,
                        password: process.env.LAVALINK_PASSWORD || "youshallnotpass",
                        secure: false, // Cambiar a true si el puerto es 443
                    }
                ],
                sendToShard: (guildId, payload) => {
                    const guild = client.guilds.cache.get(guildId);
                    if (guild) guild.shard.send(payload);
                }
            });

            // Asignación al cliente de Discord para acceso global
            client.music = this.music;

            // --- EVENTOS DE LAVALINK ---

            this.music.on("nodeConnect", (node) => {
                console.log(`[MUSIC-LOG] ✅ Nodo Lavalink conectado: ${node.options.host}`);
            });

            this.music.on("nodeError", (node, error) => {
                console.log(`[MUSIC-LOG] ❌ Error en nodo Lavalink (${node.options.host}): ${error.message}`);
            });

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
                player.destroy();
            });

            // --- CONEXIÓN CON DISCORD ---

            // Vital para que Lavalink reciba los paquetes de voz de Discord
            client.on("raw", (d) => this.music.sendRawData(d));

            // Inicializar el manager con el ID del bot
            await this.music.init(client.user.id);
            console.log("[MUSIC-LOG] 🎵 LavalinkManager inicializado y listo.");

        } catch (error) {
            console.error("[MUSIC-LOG] ❌ Error crítico durante la carga de música:", error);
        }
    }
}

// Creamos la instancia y la exportamos
const musicPlugin = new MusicPlugin();
module.exports = musicPlugin;