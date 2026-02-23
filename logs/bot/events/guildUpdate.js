const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");

module.exports = async (oldG, newG) => {
    const changes = [];
    if (oldG.name !== newG.name) changes.push({ name: "Nombre", value: "`" + oldG.name + "` → `" + newG.name + "`", inline: false });
    if (oldG.icon !== newG.icon) changes.push({ name: "Icono",  value: "Actualizado", inline: true });
    if (!changes.length) return;
    const embed = new EmbedBuilder().setTitle("⚙️ Servidor actualizado").addFields(...changes).setTimestamp();
    await sendLog(newG.client, newG.id, "server", "guildUpdate", embed);
};
