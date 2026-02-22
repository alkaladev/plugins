module.exports = (client, data) => {
    const guild = client.guilds.cache.get(data.guildId);
    if (!guild) return { data: [] };
    return {
        data: guild.roles.cache
            .filter(r => !r.managed && r.name !== "@everyone")
            .map(r => ({ id: r.id, name: r.name, color: r.hexColor !== "#000000" ? r.hexColor : "#99aab5" }))
            .sort((a, b) => b.position - a.position),
    };
};
