const { DBService, Schema } = require("strange-sdk");

class AutorolService extends DBService {
    constructor() {
        super(__dirname);
    }

    defineSchemas(_config) {
        return {
            settings: new Schema({
                _id: String,
                guildId: { type: String, required: true, unique: true },
                messages: [
                    {
                        messageId: { type: String, required: true },
                        channelId: { type: String, default: "0" },
                        title: String,
                        description: String,
                        color: { type: String, default: "#2f3136" },
                        thumbnail: String,
                        image: String,
                        footer: String,
                        buttons: [
                            {
                                roleId: { type: String, required: true },
                                label: { type: String, required: true },
                                emoji: String,
                                style: { type: String, enum: ["Primary", "Secondary", "Success", "Danger"], default: "Primary" },
                            },
                        ],
                        createdAt: { type: Date, default: Date.now },
                        updatedAt: { type: Date, default: Date.now },
                    },
                ],
            }),
        };
    }

    async getSettings(guildId) {
        const SettingsModel = this.getModel("settings");
        let settings = await SettingsModel.findOneAndUpdate(
            { _id: guildId },
            { $setOnInsert: { _id: guildId, guildId, messages: [] } },
            { upsert: true, new: true }
        );
        return settings;
    }

    async addMessage(guildId, messageData) {
        const SettingsModel = this.getModel("settings");
        const settings = await this.getSettings(guildId);

        const newMessage = {
            messageId: messageData.messageId,
            channelId: messageData.channelId,
            title: messageData.title,
            description: messageData.description,
            color: messageData.color || "#2f3136",
            thumbnail: messageData.thumbnail || null,
            image: messageData.image || null,
            footer: messageData.footer || null,
            buttons: messageData.buttons || [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        settings.messages.push(newMessage);
        await settings.save();
        return settings;
    }

    async updateMessage(guildId, messageId, updates) {
        const SettingsModel = this.getModel("settings");
        const settings = await this.getSettings(guildId);

        const message = settings.messages.find((m) => m.messageId === messageId);
        if (!message) throw new Error("Mensaje no encontrado");

        Object.assign(message, updates, { updatedAt: new Date() });
        await settings.save();
        return settings;
    }

    async deleteMessage(guildId, messageId) {
        const SettingsModel = this.getModel("settings");
        const settings = await this.getSettings(guildId);

        settings.messages = settings.messages.filter((m) => m.messageId !== messageId);
        await settings.save();
        return settings;
    }

    async addButton(guildId, messageId, buttonData) {
        const SettingsModel = this.getModel("settings");
        const settings = await this.getSettings(guildId);

        const message = settings.messages.find((m) => m.messageId === messageId);
        if (!message) throw new Error("Mensaje no encontrado");

        const newButton = {
            roleId: buttonData.roleId,
            label: buttonData.label,
            emoji: buttonData.emoji || null,
            style: buttonData.style || "Primary",
        };

        message.buttons.push(newButton);
        message.updatedAt = new Date();
        await settings.save();
        return settings;
    }

    async removeButton(guildId, messageId, roleId) {
        const SettingsModel = this.getModel("settings");
        const settings = await this.getSettings(guildId);

        const message = settings.messages.find((m) => m.messageId === messageId);
        if (!message) throw new Error("Mensaje no encontrado");

        message.buttons = message.buttons.filter((b) => b.roleId !== roleId);
        message.updatedAt = new Date();
        await settings.save();
        return settings;
    }

    async getMessageByMessageId(guildId, messageId) {
        const SettingsModel = this.getModel("settings");
        const settings = await this.getSettings(guildId);

        return settings.messages.find((m) => m.messageId === messageId);
    }
}

module.exports = new AutorolService();
