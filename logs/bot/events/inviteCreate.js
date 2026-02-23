const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
const { inviteCache } = require("../inviteCache");
module.exports = async (invite) => {
    if (!invite.guild) return;
    const cache = inviteCache.get(invite.guild.id) || new Map();
    cache.set(invite.code, 0);
    inviteCache.set(invite.guild.id, cache);
    const expires = invite.expiresTimestamp ? "<t:" + Math.floor(invite.expiresTimestamp / 1000) + ":R>" : "Nunca";
    const embed = new EmbedBuilder()
        .setTitle("🔗 Invitación creada")
        .addFields(
            { name: "Código",   value: invite.code, inline: true },
            { name: "Canal",    value: "<#" + invite.channel?.id + ">", inline: true },
            { name: "Usos máx", value: String(invite.maxUses || "∞"), inline: true },
            { name: "Expira",   value: expires, inline: true },
        )
        .setTimestamp();
    await sendLog(invite.client, invite.guild.id, "invites", "inviteCreate", embed);
};
