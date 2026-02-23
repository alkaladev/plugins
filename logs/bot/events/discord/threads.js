const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");

const handlers = [];

function register(client, db) {
    // ── Hilo creado ───────────────────────────────────────────────────────────
    const onCreate = async (thread) => {
        if (!thread.guild) return;
        const embed = new EmbedBuilder()
            .setTitle("🧵 Hilo creado")
            .setDescription(`Se ha creado el hilo **${thread.name}**`)
            .addFields(
                { name: "Nombre",  value: thread.name,              inline: true },
                { name: "En canal", value: `<#${thread.parentId}>`, inline: true },
                { name: "ID",      value: thread.id,                inline: true },
            )
            .setTimestamp();
        await sendLog(client, db, thread.guild.id, "threads", "threadCreate", embed);
    };
    client.on("threadCreate", onCreate);
    handlers.push(["threadCreate", onCreate]);

    // ── Hilo eliminado ────────────────────────────────────────────────────────
    const onDelete = async (thread) => {
        if (!thread.guild) return;
        const embed = new EmbedBuilder()
            .setTitle("🗑️ Hilo eliminado")
            .setDescription(`Se ha eliminado el hilo **${thread.name}**`)
            .addFields(
                { name: "Nombre", value: thread.name, inline: true },
                { name: "ID",     value: thread.id,   inline: true },
            )
            .setTimestamp();
        await sendLog(client, db, thread.guild.id, "threads", "threadDelete", embed);
    };
    client.on("threadDelete", onDelete);
    handlers.push(["threadDelete", onDelete]);

    // ── Hilo actualizado ──────────────────────────────────────────────────────
    const onUpdate = async (oldT, newT) => {
        if (!newT.guild) return;
        const changes = [];
        if (oldT.name !== newT.name) changes.push({ name: "Nombre", value: `\`${oldT.name}\` → \`${newT.name}\``, inline: false });

        // Archivado / desarchivado
        if (oldT.archived !== newT.archived) {
            const embed = new EmbedBuilder()
                .setTitle(newT.archived ? "📦 Hilo archivado" : "📂 Hilo desarchivado")
                .setDescription(`El hilo **${newT.name}** ha sido ${newT.archived ? "archivado" : "desarchivado"}`)
                .addFields({ name: "Canal padre", value: `<#${newT.parentId}>`, inline: true })
                .setTimestamp();
            await sendLog(client, db, newT.guild.id, "threads", "threadArchive", embed);
        }

        if (changes.length) {
            const embed = new EmbedBuilder()
                .setTitle("✏️ Hilo editado")
                .setDescription(`El hilo **${newT.name}** ha sido modificado`)
                .addFields(...changes)
                .setTimestamp();
            await sendLog(client, db, newT.guild.id, "threads", "threadUpdate", embed);
        }
    };
    client.on("threadUpdate", onUpdate);
    handlers.push(["threadUpdate", onUpdate]);
}

function unregister(client) {
    for (const [event, fn] of handlers) client.off(event, fn);
    handlers.length = 0;
}

module.exports = { register, unregister };
