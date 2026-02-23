const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
module.exports = async (oldT, newT) => {
    if (!newT.guild) return;
    if (oldT.archived !== newT.archived) {
        const embed = new EmbedBuilder().setTitle(newT.archived ? "📦 Hilo archivado" : "📂 Hilo desarchivado").setDescription("El hilo **" + newT.name + "** ha sido " + (newT.archived ? "archivado" : "desarchivado")).setTimestamp();
        await sendLog(newT.client, newT.guild.id, "threads", "threadArchive", embed);
    }
    if (oldT.name !== newT.name) {
        const embed = new EmbedBuilder().setTitle("✏️ Hilo editado").addFields({ name: "Nombre", value: "`" + oldT.name + "` → `" + newT.name + "`", inline: false }).setTimestamp();
        await sendLog(newT.client, newT.guild.id, "threads", "threadUpdate", embed);
    }
};
