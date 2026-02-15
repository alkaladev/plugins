module.exports = async (client, payload) => {
    const dbService = require("../../db.service");
    try {
        const { guildId, channelId } = payload;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) throw new Error("Guild no encontrado");

        const channel = guild.channels.cache.get(channelId);
        if (channel) {
            await channel.delete();
            await dbService.removeActiveChannel(channelId);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
