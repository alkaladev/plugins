const { DashboardPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");
const dbService = require("../db.service");

module.exports = new DashboardPlugin({
    dependencies: [],
    baseDir: __dirname,
    dbService,

    async enable() {
        Logger.info("[TempChannels-Dashboard] Plugin habilitado");
    },

    async disable() {
        Logger.info("[TempChannels-Dashboard] Plugin deshabilitado");
    },
});
