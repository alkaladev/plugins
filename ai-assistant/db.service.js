const { DBService, Schema } = require("strange-sdk");

class GeminiService extends DBService {
    constructor() {
        super(__dirname);
    }

    defineSchemas(_config) {
        return {
            settings: new Schema({
                _id: String,
                enabled: { type: Boolean, default: false },
                ai_channel: { type: String, default: null },
            }),
            globalConfig: new Schema({
                _id: { type: String, default: "global" },
                api_key: { type: String, default: "" },
            }),
        };
    }

    async getSettings(guild) {
        const guildId = typeof guild === "string" ? guild : guild.id;
        const Model = this.getModel("settings");
        let settings = await Model.findById(guildId);
        if (!settings) {
            settings = await Model.create({ _id: guildId });
        }
        return settings;
    }

    async getGlobalConfig() {
        const Model = this.getModel("globalConfig");
        let cfg = await Model.findById("global");
        if (!cfg) {
            cfg = await Model.create({ _id: "global" });
        }
        return cfg;
    }
}

module.exports = new GeminiService();