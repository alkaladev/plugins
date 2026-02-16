const { DBService, Schema } = require("strange-sdk");

class TempChannelsService extends DBService {
    constructor() {
        super(__dirname);
    }

    defineSchemas(_config) {
        return {
            settings: new Schema({
                _id: String,
                guildId: { type: String, required: true, unique: true },
                generators: [
                    {
                        sourceChannelId: String,
                        namesList: [String],
                        currentNameIndex: { type: Number, default: 0 },
                        userLimit: Number,
                        parentCategoryId: String,
                        order: { type: Number, default: 0 },
                        enabled: { type: Boolean, default: true },
                        createdAt: { type: Date, default: Date.now },
                    },
                ],
            }),

            activeChannels: new Schema(
                {
                    channelId: { type: String, required: true, unique: true },
                    guildId: { type: String, required: true },
                    sourceChannelId: String,
                    channelName: String,
                    createdAt: { type: Date, default: Date.now },
                    createdBy: String,
                },
                { _id: false }
            ),
        };
    }

    async getSettings(guildId) {
        const SettingsModel = this.getModel("settings");
        let settings = await SettingsModel.findOneAndUpdate(
            { _id: guildId },
            { $setOnInsert: { _id: guildId, guildId, generators: [] } },
            { upsert: true, new: true }
        );
        return settings;
    }

    async addGenerator(guildId, generator) {
        const SettingsModel = this.getModel("settings");
        const settings = await this.getSettings(guildId);

        const newGenerator = {
            ...generator,
            enabled: true,
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

    async toggleGenerator(guildId, sourceChannelId) {
        const SettingsModel = this.getModel("settings");
        const settings = await this.getSettings(guildId);

        const generator = settings.generators.find((g) => g.sourceChannelId === sourceChannelId);
        if (!generator) throw new Error("Generador no encontrado");

        generator.enabled = !generator.enabled;
        await settings.save();
        return settings;
    }

    async addActiveChannel(channelData) {
        const ActiveChannelsModel = this.getModel("activeChannels");
        try {
            const result = await ActiveChannelsModel.collection.insertOne({
                channelId: channelData.channelId,
                guildId: channelData.guildId,
                sourceChannelId: channelData.sourceChannelId,
                channelName: channelData.channelName,
                createdBy: channelData.createdBy,
                createdAt: new Date(),
            });
            return result;
        } catch (error) {
            console.error("[TempChannels DB] Error creando canal activo:", error);
            throw error;
        }
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
