const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
module.exports = async (emoji) => {
    const embed = new EmbedBuilder().setTitle("😢 Emoji eliminado").setDescription("Eliminado: **:" + emoji.name + ":**").setTimestamp();
    await sendLog(emoji.client, emoji.guild.id, "server", "emojiDelete", embed);
};
