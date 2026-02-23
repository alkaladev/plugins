const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
module.exports = async (role) => {
    const embed = new EmbedBuilder().setTitle("🏷️ Rol creado").setDescription("Se ha creado el rol **" + role.name + "**").addFields({ name: "Nombre", value: role.name, inline: true }, { name: "Color", value: role.hexColor, inline: true }, { name: "ID", value: role.id, inline: true }).setTimestamp();
    await sendLog(role.client, role.guild.id, "roles", "roleCreate", embed);
};
