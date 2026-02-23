const { ChannelType } = require("discord.js");
module.exports = (client, data) => {
    const guild = client.guilds.cache.get(data.guildId);
    if (!guild) return { data: [] };
    return {
        data: guild.channels.cache
            .filter(ch => ch.type === ChannelType.GuildText)
            .map(ch => ({ id: ch.id, name: ch.name }))
            .sort((a, b) => a.name.localeCompare(b.name)),
    };
};
