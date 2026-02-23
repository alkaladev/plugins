const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
module.exports = async (oldR, newR) => {
    const changes = [];
    if (oldR.name     !== newR.name)     changes.push({ name: "Nombre", value: "`" + oldR.name + "` → `" + newR.name + "`", inline: false });
    if (oldR.hexColor !== newR.hexColor) changes.push({ name: "Color",  value: "`" + oldR.hexColor + "` → `" + newR.hexColor + "`", inline: true });
    if (oldR.hoist    !== newR.hoist)    changes.push({ name: "Visible en lista", value: String(oldR.hoist) + " → " + String(newR.hoist), inline: true });
    if (!changes.length) return;
    const embed = new EmbedBuilder().setTitle("✏️ Rol editado").setDescription("El rol **" + newR.name + "** ha cambiado").addFields(...changes).setTimestamp();
    await sendLog(newR.client, newR.guild.id, "roles", "roleUpdate", embed);
};
