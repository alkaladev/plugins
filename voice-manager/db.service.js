const { DBService, Schema } = require("strange-sdk");

class VoiceService extends DBService {
    constructor() {
        super("voice-manager", __dirname);
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
        // Obtenemos el modelo solo cuando se solicita, no en el constructor
        const SettingsModel = this.getModel("settings");
        let settings = await SettingsModel.findOne({ guildId });
        if (!settings) {
            settings = await SettingsModel.create({ guildId, generators: [] });
        }
        return settings;
    }
}

module.exports = new VoiceService();