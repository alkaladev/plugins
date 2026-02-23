const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");

const handlers = [];

function register(client, db) {
    // ── Miembro entró ─────────────────────────────────────────────────────────
    const onJoin = async (member) => {
        const created = Math.floor(member.user.createdTimestamp / 1000);
        const embed = new EmbedBuilder()
            .setTitle("👋 Nuevo miembro")
            .setDescription(`**${member.user.tag}** se ha unido al servidor`)
            .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
            .addFields(
                { name: "Usuario",     value: `<@${member.id}>`, inline: true },
                { name: "ID",          value: member.id,         inline: true },
                { name: "Cuenta creada", value: `<t:${created}:R>`, inline: true },
                { name: "Miembros totales", value: String(member.guild.memberCount), inline: true },
            )
            .setTimestamp();
        await sendLog(client, db, member.guild.id, "members", "memberJoin", embed);
    };
    client.on("guildMemberAdd", onJoin);
    handlers.push(["guildMemberAdd", onJoin]);

    // ── Miembro salió ─────────────────────────────────────────────────────────
    const onLeave = async (member) => {
        const joined = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
        const embed = new EmbedBuilder()
            .setTitle("🚪 Miembro salió")
            .setDescription(`**${member.user.tag}** ha abandonado el servidor`)
            .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
            .addFields(
                { name: "Usuario", value: `${member.user.tag}`, inline: true },
                { name: "ID",      value: member.id,            inline: true },
                { name: "Se unió", value: joined ? `<t:${joined}:R>` : "Desconocido", inline: true },
            )
            .setTimestamp();
        await sendLog(client, db, member.guild.id, "members", "memberLeave", embed);
    };
    client.on("guildMemberRemove", onLeave);
    handlers.push(["guildMemberRemove", onLeave]);

    // ── Apodo / roles cambiados ───────────────────────────────────────────────
    const onMemberUpdate = async (oldM, newM) => {
        // Apodo cambiado
        if (oldM.nickname !== newM.nickname) {
            const embed = new EmbedBuilder()
                .setTitle("📝 Apodo cambiado")
                .setDescription(`El apodo de <@${newM.id}> ha cambiado`)
                .addFields(
                    { name: "Antes", value: oldM.nickname || "*Sin apodo*", inline: true },
                    { name: "Ahora", value: newM.nickname || "*Sin apodo*", inline: true },
                )
                .setTimestamp();
            await sendLog(client, db, newM.guild.id, "members", "nicknameChange", embed);
        }

        // Timeout añadido
        if (!oldM.communicationDisabledUntil && newM.communicationDisabledUntil) {
            const until = Math.floor(newM.communicationDisabledUntilTimestamp / 1000);
            const embed = new EmbedBuilder()
                .setTitle("⏰ Timeout aplicado")
                .setDescription(`<@${newM.id}> ha recibido un timeout`)
                .addFields({ name: "Hasta", value: `<t:${until}:F>`, inline: true })
                .setTimestamp();
            await sendLog(client, db, newM.guild.id, "members", "timeoutAdd", embed);
        }

        // Timeout eliminado
        if (oldM.communicationDisabledUntil && !newM.communicationDisabledUntil) {
            const embed = new EmbedBuilder()
                .setTitle("✅ Timeout eliminado")
                .setDescription(`El timeout de <@${newM.id}> ha sido eliminado`)
                .setTimestamp();
            await sendLog(client, db, newM.guild.id, "members", "timeoutRemove", embed);
        }

        // Roles cambiados → manejado por roles.js via guildMemberUpdate
        const addedRoles   = newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id));
        const removedRoles = oldM.roles.cache.filter(r => !newM.roles.cache.has(r.id));
        if (addedRoles.size || removedRoles.size) {
            const embed = new EmbedBuilder()
                .setTitle("🏷️ Roles actualizados")
                .setDescription(`Los roles de <@${newM.id}> han cambiado`)
                .addFields(
                    addedRoles.size   ? { name: "Añadidos",   value: addedRoles.map(r => `<@&${r.id}>`).join(" "),   inline: false } : null,
                    removedRoles.size ? { name: "Eliminados",  value: removedRoles.map(r => `<@&${r.id}>`).join(" "), inline: false } : null,
                ).setTimestamp();
            await sendLog(client, db, newM.guild.id, "roles", addedRoles.size ? "roleAssign" : "roleRemove", embed);
        }

        // Generico memberUpdate
        await sendLog(client, db, newM.guild.id, "members", "memberUpdate",
            new EmbedBuilder().setTitle("👤 Miembro actualizado").setDescription(`El perfil de servidor de <@${newM.id}> ha cambiado`).setTimestamp()
        );
    };
    client.on("guildMemberUpdate", onMemberUpdate);
    handlers.push(["guildMemberUpdate", onMemberUpdate]);

    // ── Perfil de usuario global actualizado ──────────────────────────────────
    const onUserUpdate = async (oldU, newU) => {
        const changes = [];
        if (oldU.username !== newU.username) changes.push({ name: "Nombre", value: `\`${oldU.username}\` → \`${newU.username}\``, inline: false });
        if (oldU.avatar   !== newU.avatar)   changes.push({ name: "Avatar", value: "Actualizado", inline: true });
        if (!changes.length) return;

        const embed = new EmbedBuilder()
            .setTitle("👤 Perfil actualizado")
            .setDescription(`El perfil de **${newU.tag}** ha cambiado`)
            .setThumbnail(newU.displayAvatarURL({ size: 128 }))
            .addFields(...changes)
            .setTimestamp();

        // Emitir en todos los servidores compartidos
        for (const guild of client.guilds.cache.values()) {
            if (guild.members.cache.has(newU.id)) {
                await sendLog(client, db, guild.id, "members", "userUpdate", embed);
            }
        }
    };
    client.on("userUpdate", onUserUpdate);
    handlers.push(["userUpdate", onUserUpdate]);
}

function unregister(client) {
    for (const [event, fn] of handlers) client.off(event, fn);
    handlers.length = 0;
}

module.exports = { register, unregister };
