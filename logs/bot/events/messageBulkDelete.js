const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
module.exports = async (messages, channel) => {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
        .setTitle("💥 Borrado masivo")
        .setDescription("Se han eliminado **" + messages.size + "** mensajes en <#" + channel.id + ">")
        .addFields({ name: "Cantidad", value: String(messages.size), inline: true })
        .setTimestamp();
    await sendLog(channel.client, channel.guild.id, "messages", "messageBulkDelete", embed);
};
