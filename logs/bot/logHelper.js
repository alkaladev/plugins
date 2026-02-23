const db = require("../db.service");

function hexToInt(hex) {
    return parseInt((hex || "#5865F2").replace("#", ""), 16);
}

async function sendLog(client, guildId, category, eventKey, embed) {
    try {
        const settings = await db.getSettings(guildId);
        const cat = settings?.[category];
        if (!cat || !cat.enabled) return;
        if (cat.events?.[eventKey] === false) return;
        if (!cat.channel) return;
        const channel = client.channels.cache.get(cat.channel);
        if (!channel?.isTextBased()) return;
        embed.setColor(hexToInt(cat.color));
        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error("[guild-logger] Error (" + category + "/" + eventKey + "):", err.message);
    }
}

module.exports = { sendLog };
