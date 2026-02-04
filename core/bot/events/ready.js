const db = require("../../db.service");

/**
 * @param {import('discord.js').Client} client
 */
module.exports = async (client) => {
    client.logger.success(`Sesión iniciada como ${client.user.tag}! (${client.user.id})`);
    client.logger.info(`Conectado a ${client.guilds.cache.size} servidores`);

    // Set language on client, guilds (TODO: Better logic in the future)
    const config = await client.coreConfig();
    client.defaultLanguage = config["LOCALE"]["DEFAULT"] || "es-ES";
    for (const guild of client.guilds.cache.values()) {
        const settings = await db.getSettings(guild);
        guild.locale = settings.locale || client.defaultLanguage;
    }

    // Register Interactions
    client.wait(5000).then(() => {
        client.guilds.cache.forEach(async (guild) => {
            await client.commandManager.registerInteractions(guild.id);
        });

        client.logger.success("Interacciones registradas exitosamente");
    });
};
