const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
module.exports = async (channel) => {
    if (!channel.guild) return;
    const embed = new EmbedBuilder().setTitle("🔗 Webhook modificado").setDescription("Los webhooks de <#" + channel.id + "> han cambiado").setTimestamp();
    await sendLog(channel.client, channel.guild.id, "server", "webhookUpdate", embed);
};
