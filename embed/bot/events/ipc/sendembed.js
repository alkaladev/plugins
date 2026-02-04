module.exports = async (payload, client) => {
    // Strange-SDK pasa los datos en payload.data o directamente en payload
    const data = payload?.data || payload;
    const { guildId, action } = data;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return { success: false, error: "Servidor no encontrado" };

    // ACCIÓN 1: Obtener canales para la Dashboard
    // Esto es lo que necesita el router.get para cargar la página
    if (action === "get_channels" || !action) {
        const channels = guild.channels.cache
            .filter((c) => c.type === 0) // Solo canales de texto
            .map((c) => ({
                id: c.id,
                name: c.name,
            }));
        return { success: true, data: channels };
    }

    // ACCIÓN 2: Enviar el Embed desde la Dashboard
    if (action === "send_embed") {
        const { channelId, embedData } = data;
        const channel = guild.channels.cache.get(channelId);
        
        if (!channel) return { success: false, error: "Canal no encontrado" };

        try {
            // Aquí puedes usar el EmbedBuilder si lo necesitas o mandarlo directo
            await channel.send({ embeds: [embedData] });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    return { success: false, error: "Acción no definida" };
};