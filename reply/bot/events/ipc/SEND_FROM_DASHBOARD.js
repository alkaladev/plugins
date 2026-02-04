/**
 * @param {Object} data - Los datos vienen PRIMERO
 * @param {import('strange-sdk').StrangeClient} client - El cliente viene SEGUNDO
 */
module.exports = async (data, client) => {
    // Extraemos message_id (con guion bajo, que es como viene del dashboard)
    const { guildId, message_id, reply_content } = data;
    
    console.log(`[IPC-EVENT] Procesando respuesta para mensaje: ${message_id}`);

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        console.log("[IPC-EVENT] Error: Guild no encontrada");
        return { success: false, error: "Servidor no encontrado" };
    }

    // Buscamos el mensaje
    const channels = guild.channels.cache.filter(c => c.isTextBased());
    let targetMessage = null;

    for (const [id, channel] of channels) {
        try {
            const msg = await channel.messages.fetch(message_id);
            if (msg) {
                targetMessage = msg;
                break;
            }
        } catch (err) { continue; }
    }

    if (!targetMessage) {
        console.log("[IPC-EVENT] Error: Mensaje no encontrado");
        return { success: false, error: "Mensaje no encontrado" };
    }

    try {
        await targetMessage.reply({ content: reply_content });
        console.log("[IPC-EVENT] ¡Enviado con éxito!");
        return { success: true };
    } catch (err) {
        console.error("[IPC-EVENT] Error al responder:", err);
        return { success: false, error: err.message };
    }
};