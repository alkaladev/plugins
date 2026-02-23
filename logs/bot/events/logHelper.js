/**
 * Utilidad compartida para enviar embeds de log al canal configurado.
 * Cada modulo de evento la importa para centralizar la logica de envio.
 */

/**
 * Convierte un color hex "#RRGGBB" al entero decimal que usa Discord.js
 */
function hexToInt(hex) {
    return parseInt((hex || "#5865F2").replace("#", ""), 16);
}

/**
 * Envia un embed de log al canal configurado para la categoria dada.
 * @param {import('discord.js').Client} client
 * @param {object} db - Instancia del DBService del plugin
 * @param {string} guildId
 * @param {string} category  - "channels" | "server" | "members" | etc.
 * @param {string} eventKey  - Clave del evento, p.ej. "channelCreate"
 * @param {import('discord.js').EmbedBuilder} embed
 */
async function sendLog(client, db, guildId, category, eventKey, embed) {
    try {
        const settings = await db.getSettings(guildId);
        const cat = settings?.[category];
        if (!cat || !cat.enabled) return;

        // Verificar que el evento concreto esta activado
        const events = cat.events || {};
        // Si la clave no existe en el objeto (undefined) la tratamos como activada por defecto
        if (events[eventKey] === false) return;

        const channelId = cat.channel;
        if (!channelId) return;

        const channel = client.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) return;

        // Aplicar el color configurado
        embed.setColor(hexToInt(cat.color));

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error(`[guild-logger] Error enviando log (${category}/${eventKey}):`, err.message);
    }
}

module.exports = { sendLog, hexToInt };
