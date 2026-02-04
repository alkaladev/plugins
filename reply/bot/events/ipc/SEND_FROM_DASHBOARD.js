/**
 * @param {import('strange-sdk').StrangeClient} client
 * @param {Object} data
 */
module.exports = async (client, data) => {
    const { guildId, messageId, content } = data;
    
    console.log(`[IPC-EVENT] Procesando respuesta para mensaje: ${messageId}`);

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: "Servidor no encontrado" };

    const channels = guild.channels.cache.filter(c => c.isTextBased());
    let targetMessage = null;

    for (const [id, channel] of channels) {
        try {
            const msg = await channel.messages.fetch(messageId);
            if (msg) {
                targetMessage = msg;
                break;
            }
        } catch (err) { continue; }
    }

    if (!targetMessage) return { success: false, error: "Mensaje no encontrado" };

    try {
        await targetMessage.reply({ content: content });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};