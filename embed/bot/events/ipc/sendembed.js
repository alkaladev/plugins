module.exports = async (payload, client) => {
    const data = payload.data || payload;
    const { guildId, message_id, reply_content } = data;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: "Servidor no encontrado" };

    const channels = guild.channels.cache.filter(c => c.isTextBased());
    let targetMessage = null;

    for (const [id, channel] of channels) {
        try {
            const msg = await channel.messages.fetch(message_id);
            if (msg) {
                targetMessage = msg;
                break;
            }
        } catch { continue; }
    }

    if (!targetMessage) return { success: false, error: "Mensaje no encontrado" };

    try {
        await targetMessage.reply({ content: reply_content });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};