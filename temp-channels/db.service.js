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
                        permissions: {
                            allowedRoles: [String],
                            blockedRoles: [String],
                            allowedUsers: [String],
                            blockedUsers: [String],
                        },
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

            channelLogs: new Schema({
                _id: String,
                guildId: { type: String, required: true },
                logs: [
                    {
                        action: String, // 'created', 'deleted', 'renamed'
                        channelId: String,
                        channelName: String,
                        userId: String,
                        sourceChannelId: String,
                        timestamp: { type: Date, default: Date.now },
                        duration: Number, // segundos que estuvo activo
                    },
                ],
            }),

            deletedChannels: new Schema({
                _id: String,
                guildId: { type: String, required: true },
                history: [
                    {
                        channelId: String,
                        channelName: String,
                        sourceChannelId: String,
                        createdBy: String,
                        createdAt: Date,
                        deletedAt: { type: Date, default: Date.now },
                        duration: Number, // segundos que estuvo activo
                        members: Number, // cantidad de usuarios cuando se eliminó
                        reason: String, // 'empty', 'timeout', 'manual'
                    },
                ],
            }),
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

    async addLog(guildId, logData) {
        const LogsModel = this.getModel("channelLogs");
        const logs = await LogsModel.findOneAndUpdate(
            { _id: guildId, guildId },
            { $push: { logs: logData }, $setOnInsert: { _id: guildId, guildId, logs: [logData] } },
            { upsert: true, new: true }
        );
        return logs;
    }

    async getLogs(guildId, limit = 50) {
        const LogsModel = this.getModel("channelLogs");
        const logs = await LogsModel.findOne({ guildId });
        if (!logs) return [];
        return logs.logs.slice(-limit).reverse();
    }

    async addDeletedChannel(guildId, channelData) {
        const DeletedModel = this.getModel("deletedChannels");
        const deleted = await DeletedModel.findOneAndUpdate(
            { _id: guildId, guildId },
            { $push: { history: channelData }, $setOnInsert: { _id: guildId, guildId, history: [channelData] } },
            { upsert: true, new: true }
        );
        return deleted;
    }

    async getDeletedChannels(guildId, limit = 50) {
        const DeletedModel = this.getModel("deletedChannels");
        const deleted = await DeletedModel.findOne({ guildId });
        if (!deleted) return [];
        return deleted.history.slice(-limit).reverse();
    }
}

module.exports = new TempChannelsService();
