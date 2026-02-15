const { BotPlugin } = require("strange-sdk");
const { ChannelType } = require("discord.js");
const config = require("./config");

const voiceManagerPlugin = new BotPlugin({
    name: "voice-manager",
    baseDir: __dirname,
});

// En tu core, los eventos se registran así para que el PluginManager los vea:
voiceManagerPlugin.eventHandlers.set("voiceStateUpdate", async (oldState, newState, plugin) => {
    // IMPORTANTE: En este sistema, el 'client' suele venir en newState.client
    const client = newState.client;
    const { guild, member } = newState;
    const newChannel = newState.channel;

    // Log para confirmar que el evento entra al sistema centralizado
    console.log(`[VOICE-SYSTEM] Evento captado para ${member?.user?.tag}`);

    if (newChannel) {
        // Lógica de detección (Nombre o ID)
        const isGenerator = config.generators.some(g => g.sourceId === newChannel.id) || 
                           newChannel.name.toLowerCase() === "battlefield";

        if (isGenerator) {
            try {
                const prefix = "Patrulla ";
                const voiceChannel = await guild.channels.create({
                    name: `${prefix}${guild.channels.cache.filter(c => c.name.startsWith(prefix)).size + 1}`,
                    type: ChannelType.GuildVoice,
                    parent: newChannel.parentId,
                    userLimit: 4,
                    reason: 'Sistema de Patrullas Akira'
                });

                await member.voice.setChannel(voiceChannel);
                console.log(`[VOICE] Canal creado y usuario movido.`);
            } catch (err) {
                console.error("[VOICE ERROR]", err.message);
            }
        }
    }

    // Lógica de borrado simple
    const oldChannel = oldState.channel;
    if (oldChannel && oldChannel.name.includes("Patrulla") && oldChannel.members.size === 0) {
        setTimeout(() => {
            oldChannel.delete().catch(() => {});
        }, 5000);
    }
});

// Handler para la Dashboard (IPC)
voiceManagerPlugin.ipcEvents.set("setup", async (data, client) => {
    const newGen = {
        sourceId: data.channel_id,
        namePrefix: data.prefix,
        userLimit: data.limit
    };
    config.generators.push(newGen);
    return { success: true };
});

module.exports = voiceManagerPlugin;