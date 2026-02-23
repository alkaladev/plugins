const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const { sendLog } = require("../logHelper");

const handlers = [];

function register(client, db) {
    // ── Canal creado ──────────────────────────────────────────────────────────
    const onCreate = async (channel) => {
        if (!channel.guild) return;
        const embed = new EmbedBuilder()
            .setTitle("📢 Canal creado")
            .setDescription(`Se ha creado el canal **#${channel.name}**`)
            .addFields(
                { name: "Nombre", value: channel.name, inline: true },
                { name: "Tipo",   value: String(channel.type), inline: true },
                { name: "ID",     value: channel.id, inline: true },
            )
            .setTimestamp();
        await sendLog(client, db, channel.guild.id, "channels", "channelCreate", embed);
    };
    client.on("channelCreate", onCreate);
    handlers.push(["channelCreate", onCreate]);

    // ── Canal eliminado ───────────────────────────────────────────────────────
    const onDelete = async (channel) => {
        if (!channel.guild) return;
        const embed = new EmbedBuilder()
            .setTitle("🗑️ Canal eliminado")
            .setDescription(`Se ha eliminado el canal **#${channel.name}**`)
            .addFields(
                { name: "Nombre", value: channel.name, inline: true },
                { name: "ID",     value: channel.id, inline: true },
            )
            .setTimestamp();
        await sendLog(client, db, channel.guild.id, "channels", "channelDelete", embed);
    };
    client.on("channelDelete", onDelete);
    handlers.push(["channelDelete", onDelete]);

    // ── Canal actualizado ─────────────────────────────────────────────────────
    const onUpdate = async (oldCh, newCh) => {
        if (!newCh.guild) return;
        const changes = [];
        if (oldCh.name  !== newCh.name)  changes.push({ name: "Nombre",  value: `\`${oldCh.name}\` → \`${newCh.name}\``,  inline: false });
        if (oldCh.topic !== newCh.topic) changes.push({ name: "Tema",    value: `\`${oldCh.topic || "vacío"}\` → \`${newCh.topic || "vacío"}\``, inline: false });
        if (oldCh.nsfw  !== newCh.nsfw)  changes.push({ name: "NSFW",    value: `${oldCh.nsfw} → ${newCh.nsfw}`, inline: true });
        if (!changes.length) return; // Ignorar actualizaciones de permisos aqui (las maneja otro evento)

        const embed = new EmbedBuilder()
            .setTitle("✏️ Canal editado")
            .setDescription(`El canal **#${newCh.name}** ha sido modificado`)
            .addFields(...changes, { name: "Canal", value: `<#${newCh.id}>`, inline: true })
            .setTimestamp();
        await sendLog(client, db, newCh.guild.id, "channels", "channelUpdate", embed);
    };
    client.on("channelUpdate", onUpdate);
    handlers.push(["channelUpdate", onUpdate]);

    // ── Permisos de canal actualizados ────────────────────────────────────────
    const onPermUpdate = async (oldCh, newCh) => {
        if (!newCh.guild) return;
        // Solo disparar si cambiaron los permisos
        const oldPerms = JSON.stringify([...oldCh.permissionOverwrites.cache.values()].map(o => o.toJSON()));
        const newPerms = JSON.stringify([...newCh.permissionOverwrites.cache.values()].map(o => o.toJSON()));
        if (oldPerms === newPerms) return;

        // Intentar obtener quien lo modifico via AuditLog
        let executor = "Desconocido";
        try {
            const logs = await newCh.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelOverwriteUpdate, limit: 1 });
            const entry = logs.entries.first();
            if (entry && Date.now() - entry.createdTimestamp < 5000) executor = `<@${entry.executor.id}>`;
        } catch (_) {}

        const embed = new EmbedBuilder()
            .setTitle("🔒 Permisos del canal actualizados")
            .setDescription(`Los permisos del canal **#${newCh.name}** han cambiado`)
            .addFields(
                { name: "Canal",     value: `<#${newCh.id}>`, inline: true },
                { name: "Moderador", value: executor,          inline: true },
            )
            .setTimestamp();
        await sendLog(client, db, newCh.guild.id, "channels", "channelPermUpdate", embed);
    };
    client.on("channelUpdate", onPermUpdate);
    handlers.push(["channelUpdate", onPermUpdate]);
}

function unregister(client) {
    for (const [event, fn] of handlers) client.off(event, fn);
    handlers.length = 0;
}

module.exports = { register, unregister };
