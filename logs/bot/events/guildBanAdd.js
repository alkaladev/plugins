const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const { sendLog } = require("../logHelper");
module.exports = async (ban) => {
    let executor = "Desconocido", reason = "Sin motivo";
    try {
        const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
        const entry = logs.entries.first();
        if (entry && Date.now() - entry.createdTimestamp < 5000) { executor = "<@" + entry.executor.id + ">"; reason = entry.reason || "Sin motivo"; }
    } catch (_) {}
    const embed = new EmbedBuilder()
        .setTitle("🔨 Usuario baneado")
        .setDescription("**" + ban.user.tag + "** ha sido baneado")
        .setThumbnail(ban.user.displayAvatarURL({ size: 128 }))
        .addFields({ name: "Moderador", value: executor, inline: true }, { name: "Motivo", value: reason, inline: false })
        .setTimestamp();
    await sendLog(ban.client, ban.guild.id, "moderation", "banAdd", embed);
};
