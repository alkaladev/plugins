const { DashboardPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");
const dbService = require("../db.service");

module.exports = new DashboardPlugin({
    dependencies: [],
    baseDir: __dirname,
    dbService,

    async enable(dbClient) {
        Logger.info("[TempChannels-Dashboard] Plugin habilitado");
        return true;
    },

    async disable() {
        Logger.info("[TempChannels-Dashboard] Plugin deshabilitado");
        return true;
    },

    async onGuildEnable(guildId) {
        Logger.info(`[TempChannels-Dashboard] Habilitado en guild: ${guildId}`);
        return true;
    },

    async onGuildDisable(guildId) {
        Logger.info(`[TempChannels-Dashboard] Deshabilitado en guild: ${guildId}`);
        return true;
    },
});
