const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const { sendLog } = require("../logHelper");

module.exports = async (member) => {
    const joined = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
    const embed = new EmbedBuilder()
        .setTitle("🚪 Miembro salió")
        .setDescription("**" + member.user.tag + "** ha abandonado el servidor")
        .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
        .addFields(
            { name: "Usuario", value: member.user.tag, inline: true },
            { name: "ID",      value: member.id, inline: true },
            { name: "Se unió", value: joined ? "<t:" + joined + ":R>" : "Desconocido", inline: true },
        )
        .setTimestamp();
    await sendLog(member.client, member.guild.id, "members", "memberLeave", embed);

    // Detectar kick via AuditLog
    try {
        const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 });
        const entry = logs.entries.first();
        if (entry && entry.target.id === member.id && Date.now() - entry.createdTimestamp < 5000) {
            const kickEmbed = new EmbedBuilder()
                .setTitle("👢 Usuario expulsado")
                .setDescription("**" + member.user.tag + "** ha sido expulsado")
                .addFields(
                    { name: "Moderador", value: "<@" + entry.executor.id + ">", inline: true },
                    { name: "Motivo",    value: entry.reason || "Sin motivo", inline: false },
                )
                .setTimestamp();
            await sendLog(member.client, member.guild.id, "moderation", "kickMember", kickEmbed);
        }
    } catch (_) {}
};
