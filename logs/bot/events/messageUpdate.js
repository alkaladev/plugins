const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");
module.exports = async (oldMsg, newMsg) => {
    if (!newMsg.guild || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    const embed = new EmbedBuilder()
        .setTitle("✏️ Mensaje editado")
        .setDescription("Editado por <@" + newMsg.author.id + "> en <#" + newMsg.channelId + ">")
        .addFields(
            { name: "Antes",  value: (oldMsg.content?.slice(0, 512) || "*vacío*"), inline: false },
            { name: "Ahora",  value: (newMsg.content?.slice(0, 512) || "*vacío*"), inline: false },
            { name: "Enlace", value: "[Ver mensaje](" + newMsg.url + ")", inline: true },
        )
        .setTimestamp();
    await sendLog(newMsg.client, newMsg.guild.id, "messages", "messageUpdate", embed);
};
