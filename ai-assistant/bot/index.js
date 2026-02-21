const { BotPlugin } = require("strange-sdk");
const db = require("../db.service");

module.exports = new BotPlugin({
    dependencies: [],
    baseDir: __dirname,

    onEnable: async (client) => {
        // Exponemos los métodos del db en el client para que los eventos puedan usarlos
        client.aiDb = {
            getSettings: (guild) => db.getSettings(guild),
            getGlobalConfig: () => db.getGlobalConfig(),
        };
    },

    dbService: db,
});
