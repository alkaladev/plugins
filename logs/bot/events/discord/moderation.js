const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const { sendLog } = require("../logHelper");

const handlers = [];

async function getExecutor(guild, auditEvent) {
    try {
        const logs  = await guild.fetchAuditLogs({ type: auditEvent, limit: 1 });
        const entry = logs.entries.first();
        if (entry && Date.now() - entry.createdTimestamp < 5000) {
            return { executor: `<@${entry.executor.id}>`, reason: entry.reason || "Sin motivo" };
        }
    } catch (_) {}
    return { executor: "Desconocido", reason: "Sin motivo" };
}

function register(client, db) {
    // ── Ban añadido ───────────────────────────────────────────────────────────
    const onBanAdd = async (ban) => {
        const { executor, reason } = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd);
        const embed = new EmbedBuilder()
            .setTitle("🔨 Usuario baneado")
            .setDescription(`**${ban.user.tag}** ha sido baneado del servidor`)
            .setThumbnail(ban.user.displayAvatarURL({ size: 128 }))
            .addFields(
                { name: "Usuario",    value: `<@${ban.user.id}>`, inline: true },
                { name: "Moderador",  value: executor,            inline: true },
                { name: "Motivo",     value: reason,              inline: false },
            )
            .setTimestamp();
        await sendLog(client, db, ban.guild.id, "moderation", "banAdd", embed);
    };
    client.on("guildBanAdd", onBanAdd);
    handlers.push(["guildBanAdd", onBanAdd]);

    // ── Ban eliminado ─────────────────────────────────────────────────────────
    const onBanRemove = async (ban) => {
        const { executor } = await getExecutor(ban.guild, AuditLogEvent.MemberBanRemove);
        const embed = new EmbedBuilder()
            .setTitle("✅ Ban eliminado")
            .setDescription(`El ban de **${ban.user.tag}** ha sido retirado`)
            .setThumbnail(ban.user.displayAvatarURL({ size: 128 }))
            .addFields(
                { name: "Usuario",   value: `<@${ban.user.id}>`, inline: true },
                { name: "Moderador", value: executor,            inline: true },
            )
            .setTimestamp();
        await sendLog(client, db, ban.guild.id, "moderation", "banRemove", embed);
    };
    client.on("guildBanRemove", onBanRemove);
    handlers.push(["guildBanRemove", onBanRemove]);

    // ── Kick (detectado via AuditLog en guildMemberRemove) ───────────────────
    const onMemberRemove = async (member) => {
        try {
            const logs  = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 });
            const entry = logs.entries.first();
            if (!entry || Date.now() - entry.createdTimestamp > 5000) return;
            if (entry.target.id !== member.id) return;

            const embed = new EmbedBuilder()
                .setTitle("👢 Usuario expulsado")
                .setDescription(`**${member.user.tag}** ha sido expulsado del servidor`)
                .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
                .addFields(
                    { name: "Usuario",   value: `<@${member.id}>`,     inline: true },
                    { name: "Moderador", value: `<@${entry.executor.id}>`, inline: true },
                    { name: "Motivo",    value: entry.reason || "Sin motivo", inline: false },
                )
                .setTimestamp();
            await sendLog(client, db, member.guild.id, "moderation", "kickMember", embed);
        } catch (_) {}
    };
    client.on("guildMemberRemove", onMemberRemove);
    handlers.push(["guildMemberRemove", onMemberRemove]);
}

function unregister(client) {
    for (const [event, fn] of handlers) client.off(event, fn);
    handlers.length = 0;
}

module.exports = { register, unregister };
