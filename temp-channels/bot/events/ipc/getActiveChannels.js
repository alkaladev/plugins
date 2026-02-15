module.exports = async (client, payload) => {
    const dbService = require("../../db.service");
    const { guildId } = payload;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return [];

    const activeChannels = await dbService.getActiveChannels(guildId);
    return activeChannels.map((ac) => {
        const channel = guild.channels.cache.get(ac.channelId);
        return {
            id: ac.channelId,
            name: channel?.name || "Desconocido",
            members: channel?.members.size || 0,
            maxMembers: channel?.userLimit || 0,
            createdAt: ac.createdAt,
            isAlive: !!channel,
        };
    });
};
