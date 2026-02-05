const { BotPlugin } = require("strange-sdk");

module.exports = new BotPlugin({
    dependencies: [],
    baseDir: __dirname,

    onEnable: async (client) => {
        // Inicializamos el manager
        client.giveawaysManager = require("./giveaway")(client);

        // IMPORTANTE: Escuchar la petición de la dashboard
        client.on("getGiveawaysOf", (guildId) => {
            try {
                // Obtenemos los sorteos de la memoria del manager filtrados por servidor
                const giveaways = client.giveawaysManager.giveaways.filter(
                    (g) => g.guildId === guildId
                );
                return { success: true, data: giveaways };
            } catch (error) {
                console.error("Error al obtener sorteos:", error);
                return { success: false, data: [] };
            }
        });
    },

    dbService: require("../db.service"),
});