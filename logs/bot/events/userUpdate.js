const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");

module.exports = async (oldU, newU) => {
    const changes = [];
    if (oldU.username !== newU.username) changes.push({ name: "Nombre", value: "`" + oldU.username + "` → `" + newU.username + "`", inline: false });
    if (oldU.avatar   !== newU.avatar)   changes.push({ name: "Avatar", value: "Actualizado", inline: true });
    if (!changes.length) return;
    const embed = new EmbedBuilder()
        .setTitle("👤 Perfil actualizado")
        .setDescription("El perfil de **" + newU.tag + "** ha cambiado")
        .setThumbnail(newU.displayAvatarURL({ size: 128 }))
        .addFields(...changes)
        .setTimestamp();
    for (const guild of newU.client.guilds.cache.values()) {
        if (guild.members.cache.has(newU.id)) {
            await sendLog(newU.client, guild.id, "members", "userUpdate", embed);
        }
    }
};
