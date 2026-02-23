const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const { sendLog } = require("../logHelper");
module.exports = async (ban) => {
    let executor = "Desconocido";
    try {
        const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit: 1 });
        const entry = logs.entries.first();
        if (entry && Date.now() - entry.createdTimestamp < 5000) executor = "<@" + entry.executor.id + ">";
    } catch (_) {}
    const embed = new EmbedBuilder()
        .setTitle("✅ Ban eliminado")
        .setDescription("El ban de **" + ban.user.tag + "** ha sido retirado")
        .addFields({ name: "Moderador", value: executor, inline: true })
        .setTimestamp();
    await sendLog(ban.client, ban.guild.id, "moderation", "banRemove", embed);
};
