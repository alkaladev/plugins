const { DashboardPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");
const dbService = require("../db.service");

class TempChannelsDashboardPlugin extends DashboardPlugin {
    constructor() {
        super({
            dependencies: [],
            baseDir: __dirname,
            dbService,
        });
    }

    async enable(dbClient) {
        Logger.info("[TempChannels-Dashboard] Plugin habilitado");
    }

    async disable() {
        Logger.info("[TempChannels-Dashboard] Plugin deshabilitado");
    }

    async onGuildEnable(guildId) {
        Logger.info(`[TempChannels-Dashboard] Habilitado en guild: ${guildId}`);
    }

    async onGuildDisable(guildId) {
        Logger.info(`[TempChannels-Dashboard] Deshabilitado en guild: ${guildId}`);
    }
}

module.exports = new TempChannelsDashboardPlugin();
