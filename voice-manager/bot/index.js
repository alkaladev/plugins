const { BotPlugin } = require("strange-sdk");
const { ChannelType } = require("discord.js");
const db = require("../db.service");

const voicePlugin = new BotPlugin({
    name: "voice-manager",
    baseDir: __dirname,
});

voicePlugin.eventHandlers.set("voiceStateUpdate", async (oldState, newState) => {
    const { guild, member } = newState;
    const newChannel = newState.channel;
    const oldChannel = oldState.channel;

    // Solo actuar si cambia de canal
    if (oldChannel?.id === newChannel?.id) return;

    // --- LÓGICA DE CREACIÓN ---
    if (newChannel) {
        const settings = await db.getSettings(guild.id);
        // Buscamos si el canal actual es un generador configurado
        const generator = settings.generators.find(g => g.sourceId === newChannel.id);

        if (generator) {
            try {
                const prefix = generator.namePrefix || "Patrulla ";
                // Contamos canales que empiecen por el prefijo en esa categoría
                const count = guild.channels.cache.filter(c => 
                    c.name.startsWith(prefix) && c.parentId === newChannel.parentId
                ).size;

                const newVoiceChannel = await guild.channels.create({
                    name: `${prefix}${count + 1}`,
                    type: ChannelType.GuildVoice,
                    parent: newChannel.parentId,
                    userLimit: generator.userLimit || 0,
                    reason: 'Akira Voice Manager'
                });

                await member.voice.setChannel(newVoiceChannel);
            } catch (err) {
                console.error("[VOICE ERROR]", err.message);
            }
        }
    }

    // --- LÓGICA DE BORRADO ---
    if (oldChannel && oldChannel.members.size === 0) {
        const settings = await db.getSettings(guild.id);
        // Borrar si el nombre del canal coincide con algún prefijo configurado
        const isPatrol = settings.generators.some(g => oldChannel.name.startsWith(g.namePrefix));
        
        if (isPatrol) {
            // Pequeño delay para evitar bugs de Discord
            setTimeout(() => {
                oldChannel.delete().catch(() => {});
            }, 2000);
        }
    }
});

module.exports = voicePlugin;