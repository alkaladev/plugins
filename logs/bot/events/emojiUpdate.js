const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
module.exports = async (oldE, newE) => {
    if (oldE.name === newE.name) return;
    const embed = new EmbedBuilder().setTitle("✏️ Emoji editado").addFields({ name: "Nombre", value: "`" + oldE.name + "` → `" + newE.name + "`", inline: true }).setTimestamp();
    await sendLog(newE.client, newE.guild.id, "server", "emojiUpdate", embed);
};
