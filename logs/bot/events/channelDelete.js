const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");

module.exports = async (channel) => {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
        .setTitle("🗑️ Canal eliminado")
        .setDescription("Se ha eliminado el canal **#" + channel.name + "**")
        .addFields(
            { name: "Nombre", value: channel.name, inline: true },
            { name: "ID",     value: channel.id,   inline: true },
        )
        .setTimestamp();
    await sendLog(channel.client, channel.guild.id, "channels", "channelDelete", embed);
};
