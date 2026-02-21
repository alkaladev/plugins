const { DBService, Schema } = require("strange-sdk");

class GeminiService extends DBService {
    constructor() {
        super(__dirname);
    }

    defineSchemas(_config) {
        return {
            settings: new Schema({
                _id: String, // ID del servidor
                enabled: { type: Boolean, default: false },
                ai_channel: { type: String, default: null },
            }),
        };
    }

    // ESTO ES VITAL: Si no pasas el objeto guild o el ID correctamente, falla.
    async getSettings(guild) {
        const guildId = typeof guild === "string" ? guild : guild.id;
        const Model = this.getModel("settings");
        let settings = await Model.findById(guildId);
        
        if (!settings) {
            settings = await Model.create({ _id: guildId });
        }
        return settings;
    }
}

module.exports = new GeminiService();