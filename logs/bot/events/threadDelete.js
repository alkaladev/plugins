const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
module.exports = async (thread) => {
    if (!thread.guild) return;
    const embed = new EmbedBuilder().setTitle("🗑️ Hilo eliminado").setDescription("Se ha eliminado el hilo **" + thread.name + "**").setTimestamp();
    await sendLog(thread.client, thread.guild.id, "threads", "threadDelete", embed);
};
