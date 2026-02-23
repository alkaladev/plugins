const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");

const handlers = [];

// Cache de invitaciones por guild para detectar usos
const inviteCache = new Map(); // guildId -> Map<code, uses>

function register(client, db) {
    // ── Poblar cache cuando el bot entra a un guild ───────────────────────────
    const onReady = async () => {
        for (const guild of client.guilds.cache.values()) {
            try {
                const invites = await guild.invites.fetch();
                inviteCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
            } catch (_) {}
        }
    };
    client.once("ready", onReady);
    handlers.push(["ready", onReady]);

    // ── Invitación creada ─────────────────────────────────────────────────────
    const onCreate = async (invite) => {
        if (!invite.guild) return;
        const expires = invite.expiresTimestamp ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>` : "Nunca";
        const embed = new EmbedBuilder()
            .setTitle("🔗 Invitación creada")
            .setDescription(`Nueva invitación creada por <@${invite.inviterId}>`)
            .addFields(
                { name: "Código",    value: invite.code,    inline: true },
                { name: "Canal",     value: `<#${invite.channel?.id}>`, inline: true },
                { name: "Usos max",  value: String(invite.maxUses || "∞"), inline: true },
                { name: "Expira",    value: expires,        inline: true },
            )
            .setTimestamp();
        // Actualizar cache
        const cache = inviteCache.get(invite.guild.id) || new Map();
        cache.set(invite.code, 0);
        inviteCache.set(invite.guild.id, cache);
        await sendLog(client, db, invite.guild.id, "invites", "inviteCreate", embed);
    };
    client.on("inviteCreate", onCreate);
    handlers.push(["inviteCreate", onCreate]);

    // ── Invitación eliminada ──────────────────────────────────────────────────
    const onDelete = async (invite) => {
        if (!invite.guild) return;
        const cache = inviteCache.get(invite.guild.id);
        cache?.delete(invite.code);
        const embed = new EmbedBuilder()
            .setTitle("🗑️ Invitación eliminada")
            .setDescription(`La invitación **${invite.code}** ha sido eliminada`)
            .addFields({ name: "Canal", value: `<#${invite.channel?.id}>`, inline: true })
            .setTimestamp();
        await sendLog(client, db, invite.guild.id, "invites", "inviteDelete", embed);
    };
    client.on("inviteDelete", onDelete);
    handlers.push(["inviteDelete", onDelete]);

    // ── Invitación usada (detectado en guildMemberAdd comparando usos) ────────
    const onMemberAdd = async (member) => {
        try {
            const newInvites = await member.guild.invites.fetch();
            const oldCache   = inviteCache.get(member.guild.id) || new Map();
            const usedInvite = newInvites.find(i => (oldCache.get(i.code) ?? 0) < i.uses);

            // Actualizar cache
            inviteCache.set(member.guild.id, new Map(newInvites.map(i => [i.code, i.uses])));

            if (!usedInvite) return;
            const embed = new EmbedBuilder()
                .setTitle("📩 Invitación usada")
                .setDescription(`<@${member.id}> entró usando la invitación **${usedInvite.code}**`)
                .addFields(
                    { name: "Miembro",   value: `<@${member.id}>`,        inline: true },
                    { name: "Invitado por", value: usedInvite.inviterId ? `<@${usedInvite.inviterId}>` : "Desconocido", inline: true },
                    { name: "Usos",      value: String(usedInvite.uses),  inline: true },
                )
                .setTimestamp();
            await sendLog(client, db, member.guild.id, "invites", "inviteUse", embed);
        } catch (_) {}
    };
    client.on("guildMemberAdd", onMemberAdd);
    handlers.push(["guildMemberAdd", onMemberAdd]);
}

function unregister(client) {
    for (const [event, fn] of handlers) client.off(event, fn);
    handlers.length = 0;
}

module.exports = { register, unregister };
