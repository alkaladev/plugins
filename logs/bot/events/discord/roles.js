const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");

const handlers = [];

function register(client, db) {
    // ── Rol creado ────────────────────────────────────────────────────────────
    const onCreate = async (role) => {
        const embed = new EmbedBuilder()
            .setTitle("🏷️ Rol creado")
            .setDescription(`Se ha creado el rol **${role.name}**`)
            .addFields(
                { name: "Nombre", value: role.name,     inline: true },
                { name: "Color",  value: role.hexColor, inline: true },
                { name: "ID",     value: role.id,       inline: true },
            )
            .setTimestamp();
        await sendLog(client, db, role.guild.id, "roles", "roleCreate", embed);
    };
    client.on("roleCreate", onCreate);
    handlers.push(["roleCreate", onCreate]);

    // ── Rol eliminado ─────────────────────────────────────────────────────────
    const onDelete = async (role) => {
        const embed = new EmbedBuilder()
            .setTitle("🗑️ Rol eliminado")
            .setDescription(`Se ha eliminado el rol **${role.name}**`)
            .addFields(
                { name: "Nombre", value: role.name, inline: true },
                { name: "ID",     value: role.id,   inline: true },
            )
            .setTimestamp();
        await sendLog(client, db, role.guild.id, "roles", "roleDelete", embed);
    };
    client.on("roleDelete", onDelete);
    handlers.push(["roleDelete", onDelete]);

    // ── Rol actualizado ───────────────────────────────────────────────────────
    const onUpdate = async (oldR, newR) => {
        const changes = [];
        if (oldR.name     !== newR.name)     changes.push({ name: "Nombre", value: `\`${oldR.name}\` → \`${newR.name}\``, inline: false });
        if (oldR.hexColor !== newR.hexColor) changes.push({ name: "Color",  value: `\`${oldR.hexColor}\` → \`${newR.hexColor}\``, inline: true });
        if (oldR.hoist    !== newR.hoist)    changes.push({ name: "Visible en miembros", value: `${oldR.hoist} → ${newR.hoist}`, inline: true });
        if (oldR.mentionable !== newR.mentionable) changes.push({ name: "Mencionable", value: `${oldR.mentionable} → ${newR.mentionable}`, inline: true });
        if (!changes.length) return;

        const embed = new EmbedBuilder()
            .setTitle("✏️ Rol editado")
            .setDescription(`El rol **${newR.name}** ha sido modificado`)
            .addFields(...changes)
            .setTimestamp();
        await sendLog(client, db, newR.guild.id, "roles", "roleUpdate", embed);
    };
    client.on("roleUpdate", onUpdate);
    handlers.push(["roleUpdate", onUpdate]);

    // Nota: roleAssign y roleRemove se manejan en members.js via guildMemberUpdate
    // para tener acceso al miembro completo y emitir correctamente.
}

function unregister(client) {
    for (const [event, fn] of handlers) client.off(event, fn);
    handlers.length = 0;
}

module.exports = { register, unregister };
