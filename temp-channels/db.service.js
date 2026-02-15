const { DBService, Schema } = require("strange-sdk");

class TempChannelsService extends DBService {
    constructor() {
        super(__dirname);
    }

    defineSchemas() {
        return {
            "settings": new Schema({
                _id: { type: String, required: true },
                generators: [{
                    sourceId: String,
                    namePrefix: { type: String, default: "Voz" },
                    userLimit: { type: Number, default: 0 }
                }]
            }),
        };
    }

    async getSettings(guild) {
        const guildId = typeof guild === "string" ? guild : guild.id;
        const Model = this.getModel("settings");
        let settings = await Model.findOne({ _id: guildId });
        if (!settings) settings = await Model.create({ _id: guildId, generators: [] });
        return settings;
    }
}

module.exports = new TempChannelsService();