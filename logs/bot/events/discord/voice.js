const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../logHelper");

const handlers = [];

function register(client, db) {
    const onVoiceUpdate = async (oldState, newState) => {
        if (!newState.guild) return;
        const member  = newState.member;
        const guildId = newState.guild.id;

        const oldCh = oldState.channel;
        const newCh = newState.channel;

        // ── Entró a voz ───────────────────────────────────────────────────────
        if (!oldCh && newCh) {
            const embed = new EmbedBuilder()
                .setTitle("🔊 Conectado a voz")
                .setDescription(`<@${member.id}> se conectó a un canal de voz`)
                .addFields({ name: "Canal", value: newCh.name, inline: true }, { name: "Usuario", value: `<@${member.id}>`, inline: true })
                .setTimestamp();
            return await sendLog(client, db, guildId, "voice", "voiceJoin", embed);
        }

        // ── Salió de voz ──────────────────────────────────────────────────────
        if (oldCh && !newCh) {
            const embed = new EmbedBuilder()
                .setTitle("🔇 Desconectado de voz")
                .setDescription(`<@${member.id}> abandonó el canal de voz`)
                .addFields({ name: "Canal", value: oldCh.name, inline: true }, { name: "Usuario", value: `<@${member.id}>`, inline: true })
                .setTimestamp();
            return await sendLog(client, db, guildId, "voice", "voiceLeave", embed);
        }

        // ── Cambió de canal ───────────────────────────────────────────────────
        if (oldCh && newCh && oldCh.id !== newCh.id) {
            const embed = new EmbedBuilder()
                .setTitle("🔄 Cambio de canal de voz")
                .setDescription(`<@${member.id}> cambió de canal`)
                .addFields(
                    { name: "Antes", value: oldCh.name, inline: true },
                    { name: "Ahora", value: newCh.name, inline: true },
                )
                .setTimestamp();
            return await sendLog(client, db, guildId, "voice", "voiceSwitch", embed);
        }

        // ── Mute ──────────────────────────────────────────────────────────────
        if (oldState.selfMute !== newState.selfMute || oldState.serverMute !== newState.serverMute) {
            const muted = newState.selfMute || newState.serverMute;
            const embed = new EmbedBuilder()
                .setTitle(muted ? "🔕 Usuario silenciado" : "🔔 Usuario dessilenciado")
                .setDescription(`<@${member.id}> ${muted ? "se ha silenciado" : "ha quitado el silencio"}`)
                .addFields({ name: "Canal", value: newCh?.name || "—", inline: true }, { name: "Tipo", value: newState.serverMute ? "Servidor" : "Propio", inline: true })
                .setTimestamp();
            return await sendLog(client, db, guildId, "voice", "voiceMute", embed);
        }

        // ── Deafen ────────────────────────────────────────────────────────────
        if (oldState.selfDeaf !== newState.selfDeaf || oldState.serverDeaf !== newState.serverDeaf) {
            const deafened = newState.selfDeaf || newState.serverDeaf;
            const embed = new EmbedBuilder()
                .setTitle(deafened ? "🦻 Usuario ensordecido" : "👂 Usuario desensordecido")
                .setDescription(`<@${member.id}> ${deafened ? "activó el modo sordo" : "desactivó el modo sordo"}`)
                .setTimestamp();
            return await sendLog(client, db, guildId, "voice", "voiceDeafen", embed);
        }

        // ── Stream ────────────────────────────────────────────────────────────
        if (oldState.streaming !== newState.streaming) {
            const embed = new EmbedBuilder()
                .setTitle(newState.streaming ? "📡 Stream iniciado" : "📡 Stream finalizado")
                .setDescription(`<@${member.id}> ${newState.streaming ? "empezó" : "paró"} a hacer stream`)
                .addFields({ name: "Canal", value: newCh?.name || oldCh?.name || "—", inline: true })
                .setTimestamp();
            return await sendLog(client, db, guildId, "voice", "voiceStream", embed);
        }
    };

    client.on("voiceStateUpdate", onVoiceUpdate);
    handlers.push(["voiceStateUpdate", onVoiceUpdate]);
}

function unregister(client) {
    for (const [event, fn] of handlers) client.off(event, fn);
    handlers.length = 0;
}

module.exports = { register, unregister };
