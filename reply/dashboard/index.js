// bot/plugins/reply/index.js (Versión con Listener)
const { BotPlugin } = require("strange-sdk");

module.exports = new BotPlugin({
    dependencies: [],
    ownerOnly: false,
    baseDir: __dirname,

    // Este método lo ejecuta el pluginManager cuando recibe eventos
    async onPluginMessage(message) {
        const { eventName, data } = message;

        if (eventName === "REPLY_TO_MESSAGE") {
            const { channelId, messageId, content } = data.payload;
            try {
                const channel = await this.client.channels.fetch(channelId);
                const targetMsg = await channel.messages.fetch(messageId);
                await targetMsg.reply(content);
                return message.reply({ success: true });
            } catch (error) {
                return message.reply({ success: false, error: error.message });
            }
        }
    }
});