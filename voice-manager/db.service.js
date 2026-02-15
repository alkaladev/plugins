const { DBService, Schema } = require("strange-sdk");

class VoiceService extends DBService {
    constructor() {
        super(__dirname);
    }

    defineSchemas() {
        return {
            settings: new Schema({
                guildId: { type: String, required: true, unique: true },
                generators: [{
                    sourceId: String,
                    namePrefix: String,
                    userLimit: Number,
                    order: { type: Number, default: 0 }
                }]
            }),
        };
    }

    async getSettings(guildId) {
        let settings = await this.getModel("settings").findOne({ guildId });
        if (!settings) {
            settings = await this.getModel("settings").create({ guildId, generators: [] });
        }
        return settings;
    }
}

module.exports = new VoiceService();