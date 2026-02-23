function hexToInt(hex) {
    return parseInt((hex || "#5865F2").replace("#", ""), 16);
}

async function sendLog(client, db, guildId, category, eventKey, embed) {
    try {
        const settings = await db.getSettings(guildId);
        const cat = settings?.[category];
        if (!cat || !cat.enabled) return;
        const events = cat.events || {};
        if (events[eventKey] === false) return;
        const channelId = cat.channel;
        if (!channelId) return;
        const channel = client.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) return;
        embed.setColor(hexToInt(cat.color));
        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error("[guild-logger] Error enviando log (" + category + "/" + eventKey + "):", err.message);
    }
}

module.exports = { sendLog, hexToInt };
