const { DBService, Schema } = require("strange-sdk");

class TempChannelsService extends DBService {
    constructor() {
        super("temp-channels", __dirname);
    }

    defineSchemas() {
        return {
            settings: new Schema({
                guildId: { type: String, required: true, unique: true },
                generators: [
                    {
                        sourceChannelId: String,
                        namePrefix: String,
                        userLimit: Number,
                        parentCategoryId: String,
                        order: { type: Number, default: 0 },
                        createdAt: { type: Date, default: Date.now },
                    },
                ],
            }),

            activeChannels: new Schema({
                channelId: { type: String, required: true, unique: true },
                guildId: { type: String, required: true },
                sourceChannelId: String,
                namePrefix: String,
                createdAt: { type: Date, default: Date.now },
                createdBy: String,
            }),
        };
    }

    async getSettings(guildId) {
        const SettingsModel = this.getModel("settings");
        let settings = await SettingsModel.findOne({ guildId });
        if (!settings) {
            settings = await SettingsModel.create({ guildId, generators: [] });
        }
        return settings;
    }

    async addGenerator(guildId, generator) {
        const SettingsModel = this.getModel("settings");
        const settings = await this.getSettings(guildId);

        const newGenerator = {
            ...generator,
            order: settings.generators.length,
            createdAt: new Date(),
        };

        settings.generators.push(newGenerator);
        await settings.save();
        return settings;
    }

    async updateGenerator(guildId, sourceChannelId, updates) {
        const SettingsModel = this.getModel("settings");
        const settings = await this.getSettings(guildId);

        const generator = settings.generators.find((g) => g.sourceChannelId === sourceChannelId);
        if (!generator) throw new Error("Generador no encontrado");

        Object.assign(generator, updates);
        await settings.save();
        return settings;
    }

    async deleteGenerator(guildId, sourceChannelId) {
        const SettingsModel = this.getModel("settings");
        const settings = await this.getSettings(guildId);

        settings.generators = settings.generators.filter(
            (g) => g.sourceChannelId !== sourceChannelId,
        );
        await settings.save();
        return settings;
    }

    async addActiveChannel(channelData) {
        const ActiveChannelsModel = this.getModel("activeChannels");
        return await ActiveChannelsModel.create(channelData);
    }

    async getActiveChannels(guildId) {
        const ActiveChannelsModel = this.getModel("activeChannels");
        return await ActiveChannelsModel.find({ guildId });
    }

    async removeActiveChannel(channelId) {
        const ActiveChannelsModel = this.getModel("activeChannels");
        return await ActiveChannelsModel.deleteOne({ channelId });
    }

    async getActiveChannelCount(sourceChannelId) {
        const ActiveChannelsModel = this.getModel("activeChannels");
        return await ActiveChannelsModel.countDocuments({ sourceChannelId });
    }
}

module.exports = new TempChannelsService();
