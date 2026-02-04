/**
 * @param {import('discord.js').Client} client
 */
module.exports = async (client) => {
    client.logger.info("Inicializando el administrador de recompensas...");
    client.giveawaysManager
        ._init()
        .then((_) => client.logger.success("Administrador de recompensas inicializado"));
};
