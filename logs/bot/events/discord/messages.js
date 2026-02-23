const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");

const handlers = [];

function register(client, db) {
    // ── Mensaje eliminado ─────────────────────────────────────────────────────
    const onDelete = async (message) => {
        if (!message.guild || message.author?.bot) return;
        const embed = new EmbedBuilder()
            .setTitle("🗑️ Mensaje eliminado")
            .setDescription(
                `Mensaje de <@${message.author?.id ?? "Desconocido"}> eliminado en <#${message.channelId}>`
            )
            .addFields(
                { name: "Autor", value: message.author ? `<@${message.author.id}>` : "Desconocido", inline: true },
                { name: "Canal", value: `<#${message.channelId}>`, inline: true },
                { name: "Contenido", value: message.content ? message.content.slice(0, 1024) : "*Sin contenido de texto*", inline: false },
            )
            .setTimestamp();
        await sendLog(client, db, message.guild.id, "messages", "messageDelete", embed);
    };
    client.on("messageDelete", onDelete);
    handlers.push(["messageDelete", onDelete]);

    // ── Borrado masivo ────────────────────────────────────────────────────────
    const onBulkDelete = async (messages, channel) => {
        if (!channel.guild) return;
        const embed = new EmbedBuilder()
            .setTitle("💥 Borrado masivo de mensajes")
            .setDescription(`Se han eliminado **${messages.size}** mensajes en <#${channel.id}>`)
            .addFields({ name: "Canal", value: `<#${channel.id}>`, inline: true }, { name: "Cantidad", value: String(messages.size), inline: true })
            .setTimestamp();
        await sendLog(client, db, channel.guild.id, "messages", "messageBulkDelete", embed);
    };
    client.on("messageDeleteBulk", onBulkDelete);
    handlers.push(["messageDeleteBulk", onBulkDelete]);

    // ── Mensaje editado ───────────────────────────────────────────────────────
    const onEdit = async (oldMsg, newMsg) => {
        if (!newMsg.guild || newMsg.author?.bot) return;
        if (oldMsg.content === newMsg.content) return;
        const embed = new EmbedBuilder()
            .setTitle("✏️ Mensaje editado")
            .setDescription(`Mensaje editado por <@${newMsg.author.id}> en <#${newMsg.channelId}>`)
            .addFields(
                { name: "Antes",  value: oldMsg.content?.slice(0, 512) || "*vacío*", inline: false },
                { name: "Ahora",  value: newMsg.content?.slice(0, 512) || "*vacío*", inline: false },
                { name: "Enlace", value: `[Ver mensaje](${newMsg.url})`, inline: true },
            )
            .setTimestamp();
        await sendLog(client, db, newMsg.guild.id, "messages", "messageUpdate", embed);
    };
    client.on("messageUpdate", onEdit);
    handlers.push(["messageUpdate", onEdit]);

    // ── Mensaje fijado ────────────────────────────────────────────────────────
    const onChannelUpdate = async (oldCh, newCh) => {
        if (!newCh.guild) return;
        if (!oldCh.lastPinTimestamp && newCh.lastPinTimestamp ||
             oldCh.lastPinTimestamp !== newCh.lastPinTimestamp) {
            const embed = new EmbedBuilder()
                .setTitle("📌 Mensaje fijado")
                .setDescription(`Se ha fijado o desfijado un mensaje en <#${newCh.id}>`)
                .addFields({ name: "Canal", value: `<#${newCh.id}>`, inline: true })
                .setTimestamp();
            await sendLog(client, db, newCh.guild.id, "messages", "messagePinned", embed);
        }
    };
    client.on("channelUpdate", onChannelUpdate);
    handlers.push(["channelUpdate", onChannelUpdate]);
}

function unregister(client) {
    for (const [event, fn] of handlers) client.off(event, fn);
    handlers.length = 0;
}

module.exports = { register, unregister };
