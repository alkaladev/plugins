const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");

const handlers = [];

function register(client, db) {
    // ── Servidor actualizado ──────────────────────────────────────────────────
    const onGuildUpdate = async (oldG, newG) => {
        const changes = [];
        if (oldG.name         !== newG.name)         changes.push({ name: "Nombre",       value: `\`${oldG.name}\` → \`${newG.name}\``,         inline: false });
        if (oldG.icon         !== newG.icon)         changes.push({ name: "Icono",        value: "Actualizado",                                   inline: true  });
        if (oldG.verificationLevel !== newG.verificationLevel) changes.push({ name: "Nivel verificación", value: `${oldG.verificationLevel} → ${newG.verificationLevel}`, inline: true });
        if (!changes.length) return;

        const embed = new EmbedBuilder()
            .setTitle("⚙️ Servidor actualizado")
            .setDescription(`La configuración del servidor **${newG.name}** ha cambiado`)
            .addFields(...changes)
            .setTimestamp();
        await sendLog(client, db, newG.id, "server", "guildUpdate", embed);
    };
    client.on("guildUpdate", onGuildUpdate);
    handlers.push(["guildUpdate", onGuildUpdate]);

    // ── Emoji creado ──────────────────────────────────────────────────────────
    const onEmojiCreate = async (emoji) => {
        const embed = new EmbedBuilder()
            .setTitle("😄 Emoji añadido")
            .setDescription(`Se ha añadido el emoji **:${emoji.name}:**`)
            .addFields(
                { name: "Nombre", value: emoji.name, inline: true },
                { name: "ID",     value: emoji.id,   inline: true },
            )
            .setThumbnail(emoji.url)
            .setTimestamp();
        await sendLog(client, db, emoji.guild.id, "server", "emojiCreate", embed);
    };
    client.on("emojiCreate", onEmojiCreate);
    handlers.push(["emojiCreate", onEmojiCreate]);

    // ── Emoji eliminado ───────────────────────────────────────────────────────
    const onEmojiDelete = async (emoji) => {
        const embed = new EmbedBuilder()
            .setTitle("😢 Emoji eliminado")
            .setDescription(`Se ha eliminado el emoji **:${emoji.name}:**`)
            .addFields({ name: "Nombre", value: emoji.name, inline: true }, { name: "ID", value: emoji.id, inline: true })
            .setTimestamp();
        await sendLog(client, db, emoji.guild.id, "server", "emojiDelete", embed);
    };
    client.on("emojiDelete", onEmojiDelete);
    handlers.push(["emojiDelete", onEmojiDelete]);

    // ── Emoji editado ─────────────────────────────────────────────────────────
    const onEmojiUpdate = async (oldE, newE) => {
        if (oldE.name === newE.name) return;
        const embed = new EmbedBuilder()
            .setTitle("✏️ Emoji editado")
            .addFields({ name: "Nombre", value: `\`${oldE.name}\` → \`${newE.name}\``, inline: true })
            .setThumbnail(newE.url)
            .setTimestamp();
        await sendLog(client, db, newE.guild.id, "server", "emojiUpdate", embed);
    };
    client.on("emojiUpdate", onEmojiUpdate);
    handlers.push(["emojiUpdate", onEmojiUpdate]);

    // ── Sticker creado ────────────────────────────────────────────────────────
    const onStickerCreate = async (sticker) => {
        const embed = new EmbedBuilder()
            .setTitle("🗒️ Sticker añadido")
            .setDescription(`Se ha añadido el sticker **${sticker.name}**`)
            .addFields({ name: "Nombre", value: sticker.name, inline: true }, { name: "ID", value: sticker.id, inline: true })
            .setTimestamp();
        await sendLog(client, db, sticker.guild?.id, "server", "stickerCreate", embed);
    };
    client.on("stickerCreate", onStickerCreate);
    handlers.push(["stickerCreate", onStickerCreate]);

    // ── Sticker eliminado ─────────────────────────────────────────────────────
    const onStickerDelete = async (sticker) => {
        const embed = new EmbedBuilder()
            .setTitle("🗑️ Sticker eliminado")
            .setDescription(`Se ha eliminado el sticker **${sticker.name}**`)
            .addFields({ name: "Nombre", value: sticker.name, inline: true }, { name: "ID", value: sticker.id, inline: true })
            .setTimestamp();
        await sendLog(client, db, sticker.guild?.id, "server", "stickerDelete", embed);
    };
    client.on("stickerDelete", onStickerDelete);
    handlers.push(["stickerDelete", onStickerDelete]);

    // ── Webhook creado ────────────────────────────────────────────────────────
    const onWebhooksUpdate = async (channel) => {
        // Discord solo emite webhooksUpdate sin indicar create/delete, asi que registramos el cambio generico
        const embed = new EmbedBuilder()
            .setTitle("🔗 Webhook modificado")
            .setDescription(`Los webhooks del canal <#${channel.id}> han cambiado`)
            .setTimestamp();
        await sendLog(client, db, channel.guild?.id, "server", "webhookCreate", embed);
    };
    client.on("webhooksUpdate", onWebhooksUpdate);
    handlers.push(["webhooksUpdate", onWebhooksUpdate]);
}

function unregister(client) {
    for (const [event, fn] of handlers) client.off(event, fn);
    handlers.length = 0;
}

module.exports = { register, unregister };
