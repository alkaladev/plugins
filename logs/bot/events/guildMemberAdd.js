const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
const { inviteCache } = require("../inviteCache");

module.exports = async (member) => {
    const created = Math.floor(member.user.createdTimestamp / 1000);
    const embed = new EmbedBuilder()
        .setTitle("👋 Nuevo miembro")
        .setDescription("**" + member.user.tag + "** se ha unido al servidor")
        .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
        .addFields(
            { name: "Usuario", value: "<@" + member.id + ">", inline: true },
            { name: "ID",      value: member.id, inline: true },
            { name: "Cuenta creada",    value: "<t:" + created + ":R>", inline: true },
            { name: "Miembros totales", value: String(member.guild.memberCount), inline: true },
        )
        .setTimestamp();
    await sendLog(member.client, member.guild.id, "members", "memberJoin", embed);

    // Tracking de invitaciones
    try {
        const newInvites = await member.guild.invites.fetch();
        const oldCache   = inviteCache.get(member.guild.id) || new Map();
        const used = newInvites.find(i => (oldCache.get(i.code) ?? 0) < i.uses);
        inviteCache.set(member.guild.id, new Map(newInvites.map(i => [i.code, i.uses])));
        if (used) {
            const invEmbed = new EmbedBuilder()
                .setTitle("📩 Invitación usada")
                .setDescription("<@" + member.id + "> entró usando **" + used.code + "**")
                .addFields(
                    { name: "Invitado por", value: used.inviterId ? "<@" + used.inviterId + ">" : "Desconocido", inline: true },
                    { name: "Usos totales", value: String(used.uses), inline: true },
                )
                .setTimestamp();
            await sendLog(member.client, member.guild.id, "invites", "inviteUse", invEmbed);
        }
    } catch (_) {}
};
