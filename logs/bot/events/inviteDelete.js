const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
const { inviteCache } = require("../inviteCache");
module.exports = async (invite) => {
    if (!invite.guild) return;
    inviteCache.get(invite.guild.id)?.delete(invite.code);
    const embed = new EmbedBuilder().setTitle("🗑️ Invitación eliminada").setDescription("La invitación **" + invite.code + "** ha sido eliminada").setTimestamp();
    await sendLog(invite.client, invite.guild.id, "invites", "inviteDelete", embed);
};
