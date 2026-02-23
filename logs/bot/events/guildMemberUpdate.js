const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");

module.exports = async (oldM, newM) => {
    // Apodo
    if (oldM.nickname !== newM.nickname) {
        const embed = new EmbedBuilder()
            .setTitle("📝 Apodo cambiado")
            .setDescription("El apodo de <@" + newM.id + "> ha cambiado")
            .addFields(
                { name: "Antes", value: oldM.nickname || "*Sin apodo*", inline: true },
                { name: "Ahora", value: newM.nickname || "*Sin apodo*", inline: true },
            )
            .setTimestamp();
        await sendLog(newM.client, newM.guild.id, "members", "nicknameChange", embed);
    }
    // Timeout añadido
    if (!oldM.communicationDisabledUntil && newM.communicationDisabledUntil) {
        const until = Math.floor(newM.communicationDisabledUntilTimestamp / 1000);
        const embed = new EmbedBuilder()
            .setTitle("⏰ Timeout aplicado")
            .setDescription("<@" + newM.id + "> ha recibido un timeout")
            .addFields({ name: "Hasta", value: "<t:" + until + ":F>", inline: true })
            .setTimestamp();
        await sendLog(newM.client, newM.guild.id, "members", "timeoutAdd", embed);
    }
    // Timeout eliminado
    if (oldM.communicationDisabledUntil && !newM.communicationDisabledUntil) {
        const embed = new EmbedBuilder()
            .setTitle("✅ Timeout eliminado")
            .setDescription("El timeout de <@" + newM.id + "> ha sido eliminado")
            .setTimestamp();
        await sendLog(newM.client, newM.guild.id, "members", "timeoutRemove", embed);
    }
    // Roles asignados
    const addedRoles   = newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id));
    const removedRoles = oldM.roles.cache.filter(r => !newM.roles.cache.has(r.id));
    if (addedRoles.size) {
        const embed = new EmbedBuilder()
            .setTitle("🏷️ Rol asignado")
            .setDescription("A <@" + newM.id + "> se le han asignado roles")
            .addFields({ name: "Roles añadidos", value: addedRoles.map(r => "<@&" + r.id + ">").join(" "), inline: false })
            .setTimestamp();
        await sendLog(newM.client, newM.guild.id, "roles", "roleAssign", embed);
    }
    if (removedRoles.size) {
        const embed = new EmbedBuilder()
            .setTitle("🏷️ Rol quitado")
            .setDescription("A <@" + newM.id + "> se le han quitado roles")
            .addFields({ name: "Roles eliminados", value: removedRoles.map(r => "<@&" + r.id + ">").join(" "), inline: false })
            .setTimestamp();
        await sendLog(newM.client, newM.guild.id, "roles", "roleRemove", embed);
    }
};
