const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
module.exports = async (message) => {
    if (!message.guild || message.author?.bot) return;
    const embed = new EmbedBuilder()
        .setTitle("🗑️ Mensaje eliminado")
        .setDescription("Mensaje de <@" + (message.author?.id ?? "Desconocido") + "> en <#" + message.channelId + ">")
        .addFields(
            { name: "Autor",     value: message.author ? "<@" + message.author.id + ">" : "Desconocido", inline: true },
            { name: "Canal",     value: "<#" + message.channelId + ">", inline: true },
            { name: "Contenido", value: message.content ? message.content.slice(0, 1024) : "*Sin texto*", inline: false },
        )
        .setTimestamp();
    await sendLog(message.client, message.guild.id, "messages", "messageDelete", embed);
};
