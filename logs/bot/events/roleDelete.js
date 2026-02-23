const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
module.exports = async (role) => {
    const embed = new EmbedBuilder().setTitle("🗑️ Rol eliminado").setDescription("Se ha eliminado el rol **" + role.name + "**").addFields({ name: "Nombre", value: role.name, inline: true }, { name: "ID", value: role.id, inline: true }).setTimestamp();
    await sendLog(role.client, role.guild.id, "roles", "roleDelete", embed);
};
