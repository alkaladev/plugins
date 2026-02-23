const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");

module.exports = async (oldState, newState) => {
    if (!newState.guild) return;
    const member  = newState.member;
    const guildId = newState.guild.id;
    const oldCh = oldState.channel;
    const newCh = newState.channel;

    if (!oldCh && newCh) {
        const embed = new EmbedBuilder().setTitle("🔊 Conectado a voz").setDescription("<@" + member.id + "> se conectó a **" + newCh.name + "**").setTimestamp();
        return await sendLog(newState.client, guildId, "voice", "voiceJoin", embed);
    }
    if (oldCh && !newCh) {
        const embed = new EmbedBuilder().setTitle("🔇 Desconectado de voz").setDescription("<@" + member.id + "> abandonó **" + oldCh.name + "**").setTimestamp();
        return await sendLog(newState.client, guildId, "voice", "voiceLeave", embed);
    }
    if (oldCh && newCh && oldCh.id !== newCh.id) {
        const embed = new EmbedBuilder().setTitle("🔄 Cambio de canal").addFields({ name: "Antes", value: oldCh.name, inline: true }, { name: "Ahora", value: newCh.name, inline: true }).setTimestamp();
        return await sendLog(newState.client, guildId, "voice", "voiceSwitch", embed);
    }
    if (oldState.selfMute !== newState.selfMute || oldState.serverMute !== newState.serverMute) {
        const muted = newState.selfMute || newState.serverMute;
        const embed = new EmbedBuilder().setTitle(muted ? "🔕 Silenciado" : "🔔 Dessilenciado").setDescription("<@" + member.id + "> " + (muted ? "se ha silenciado" : "ha quitado el silencio")).setTimestamp();
        return await sendLog(newState.client, guildId, "voice", "voiceMute", embed);
    }
    if (oldState.selfDeaf !== newState.selfDeaf || oldState.serverDeaf !== newState.serverDeaf) {
        const deafened = newState.selfDeaf || newState.serverDeaf;
        const embed = new EmbedBuilder().setTitle(deafened ? "🦻 Ensordecido" : "👂 Desensordecido").setDescription("<@" + member.id + "> " + (deafened ? "activó modo sordo" : "desactivó modo sordo")).setTimestamp();
        return await sendLog(newState.client, guildId, "voice", "voiceDeafen", embed);
    }
    if (oldState.streaming !== newState.streaming) {
        const embed = new EmbedBuilder().setTitle(newState.streaming ? "📡 Stream iniciado" : "📡 Stream finalizado").setDescription("<@" + member.id + "> " + (newState.streaming ? "empezó" : "paró") + " de hacer stream").setTimestamp();
        return await sendLog(newState.client, guildId, "voice", "voiceStream", embed);
    }
};
