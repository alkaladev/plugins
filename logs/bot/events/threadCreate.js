const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
module.exports = async (thread) => {
    if (!thread.guild) return;
    const embed = new EmbedBuilder().setTitle("🧵 Hilo creado").setDescription("Se ha creado el hilo **" + thread.name + "**").addFields({ name: "Canal padre", value: "<#" + thread.parentId + ">", inline: true }).setTimestamp();
    await sendLog(thread.client, thread.guild.id, "threads", "threadCreate", embed);
};
