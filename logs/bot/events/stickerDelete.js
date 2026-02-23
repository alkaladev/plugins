const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
module.exports = async (sticker) => {
    if (!sticker.guild) return;
    const embed = new EmbedBuilder().setTitle("🗑️ Sticker eliminado").setDescription("Eliminado: **" + sticker.name + "**").setTimestamp();
    await sendLog(sticker.client, sticker.guild.id, "server", "stickerDelete", embed);
};
