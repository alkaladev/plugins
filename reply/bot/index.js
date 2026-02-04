const { BotPlugin } = require("strange-sdk");
const path = require("path");

module.exports = new BotPlugin({
    dependencies: [],
    baseDir: __dirname,

    async onReady() {
        console.log("[BOT] Plugin Reply escuchando eventos del Dashboard...");

        this.subscribe("reply:SEND_FROM_DASHBOARD", async (data) => {
            const { guildId, messageId, content } = data;
            console.log(`[BOT-IPC] Recibida orden para mensaje ${messageId} en guild ${guildId}`);

            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                console.log("[BOT-IPC] ERROR: Guild no encontrada en caché");
                return { success: false, error: "Servidor no encontrado" };
            }

            const channels = guild.channels.cache.filter(c => c.isTextBased());
            console.log(`[BOT-IPC] Buscando en ${channels.size} canales...`);

            let targetMessage = null;
            for (const [id, channel] of channels) {
                try {
                    // Solo buscamos en canales donde tengamos permiso de ver mensajes
                    const msg = await channel.messages.fetch(messageId);
                    if (msg) {
                        targetMessage = msg;
                        console.log(`[BOT-IPC] ¡Mensaje encontrado en canal: ${channel.name}!`);
                        break;
                    }
                } catch (err) {
                    // console.log(`[BOT-IPC] No encontrado en ${channel.name}`);
                }
            }

            if (!targetMessage) {
                console.log(`[BOT-IPC] ERROR: No se encontró el mensaje ${messageId} en ningún canal.`);
                return { success: false, error: "ID de mensaje no encontrado" };
            }

            try {
                await targetMessage.reply({ content: content });
                console.log("[BOT-IPC] Respuesta enviada con éxito.");
                return { success: true };
            } catch (err) {
                console.error("[BOT-IPC] ERROR al responder:", err.message);
                return { success: false, error: err.message };
            }
        });
    }
});