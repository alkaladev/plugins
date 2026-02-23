const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
module.exports = async (emoji) => {
    const embed = new EmbedBuilder().setTitle("😄 Emoji añadido").setDescription("Añadido: **:" + emoji.name + ":**").setThumbnail(emoji.url).setTimestamp();
    await sendLog(emoji.client, emoji.guild.id, "server", "emojiCreate", embed);
};
