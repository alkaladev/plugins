const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const { sendLog } = require("../logHelper");

module.exports = async (oldCh, newCh) => {
    if (!newCh.guild) return;

    // Permisos actualizados
    const oldPerms = JSON.stringify([...oldCh.permissionOverwrites.cache.values()].map(o => o.toJSON()));
    const newPerms = JSON.stringify([...newCh.permissionOverwrites.cache.values()].map(o => o.toJSON()));
    if (oldPerms !== newPerms) {
        let executor = "Desconocido";
        try {
            const logs = await newCh.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelOverwriteUpdate, limit: 1 });
            const entry = logs.entries.first();
            if (entry && Date.now() - entry.createdTimestamp < 5000) executor = "<@" + entry.executor.id + ">";
        } catch (_) {}
        const embed = new EmbedBuilder()
            .setTitle("🔒 Permisos del canal actualizados")
            .setDescription("Los permisos de **#" + newCh.name + "** han cambiado")
            .addFields({ name: "Canal", value: "<#" + newCh.id + ">", inline: true }, { name: "Moderador", value: executor, inline: true })
            .setTimestamp();
        await sendLog(newCh.client, newCh.guild.id, "channels", "channelPermUpdate", embed);
    }

    // Nombre / tema
    const changes = [];
    if (oldCh.name  !== newCh.name)  changes.push({ name: "Nombre", value: "`" + oldCh.name + "` → `" + newCh.name + "`", inline: false });
    if (oldCh.topic !== newCh.topic) changes.push({ name: "Tema",   value: "`" + (oldCh.topic || "vacío") + "` → `" + (newCh.topic || "vacío") + "`", inline: false });
    if (changes.length) {
        const embed = new EmbedBuilder()
            .setTitle("✏️ Canal editado")
            .setDescription("El canal **#" + newCh.name + "** ha sido modificado")
            .addFields(...changes, { name: "Canal", value: "<#" + newCh.id + ">", inline: true })
            .setTimestamp();
        await sendLog(newCh.client, newCh.guild.id, "channels", "channelUpdate", embed);
    }

    // Pin de mensaje
    if (oldCh.lastPinTimestamp !== newCh.lastPinTimestamp) {
        const embed = new EmbedBuilder()
            .setTitle("📌 Mensaje fijado")
            .setDescription("Se ha fijado o desfijado un mensaje en <#" + newCh.id + ">")
            .setTimestamp();
        await sendLog(newCh.client, newCh.guild.id, "messages", "messagePinned", embed);
    }
};
