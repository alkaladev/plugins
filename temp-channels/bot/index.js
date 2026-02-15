const { BotPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");

console.log("[TempChannels] Bot plugin cargando...");

try {
    const plugin = new BotPlugin({
        dependencies: [],
        baseDir: __dirname,

        onEnable: (client) => {
            try {
                console.log("[TempChannels] onEnable LLAMADO");
                Logger.info("[TempChannels] Plugin habilitado - onEnable");

                const dbService = require("../db.service");
                console.log("[TempChannels] dbService cargado");

                // Escuchar cambios en canales de voz
                client.on("voiceStateUpdate", async (oldState, newState) => {
                    try {
                        const { channel, member, guild } = newState;

                        if (!oldState.channel && channel) {
                            console.log("[TempChannels] Usuario conectado a canal:", channel.name);
                            const settings = await dbService.getSettings(guild.id);
                            const generator = settings.generators.find((g) => g.sourceChannelId === channel.id);
                            if (!generator) return;

                            const count = await dbService.getActiveChannelCount(channel.id);
                            const channelNumber = count + 1;
                            const tempChannelName = `${generator.namePrefix} ${channelNumber}`;

                            const tempChannel = await guild.channels.create({
                                name: tempChannelName,
                                type: 2,
                                parent: generator.parentCategoryId || channel.parentId,
                                userLimit: generator.userLimit || 0,
                            });

                            await dbService.addActiveChannel({
                                channelId: tempChannel.id,
                                guildId: guild.id,
                                sourceChannelId: channel.id,
                                namePrefix: generator.namePrefix,
                                createdBy: member.id,
                            });

                            await member.voice.setChannel(tempChannel);
                            Logger.info(`[TempChannels] Canal temporal creado: ${tempChannelName}`);
                        }
                        else if (oldState.channel && (!newState.channel || oldState.channel.id !== newState.channel?.id)) {
                            console.log("[TempChannels] Usuario desconectado de canal:", oldState.channel.name);
                            const guild = oldState.guild;
                            if (!guild) return;

                            const activeChannels = await dbService.getActiveChannels(guild.id);
                            for (const activeChannel of activeChannels) {
                                try {
                                    const channel = guild.channels.cache.get(activeChannel.channelId);
                                    if (!channel) {
                                        await dbService.removeActiveChannel(activeChannel.channelId);
                                        continue;
                                    }

                                    if (channel.members.size === 0) {
                                        await channel.delete();
                                        await dbService.removeActiveChannel(activeChannel.channelId);
                                        Logger.info(`[TempChannels] Canal temporal eliminado: ${channel.name}`);
                                    }
                                } catch (error) {
                                    Logger.error("[TempChannels] Error limpiando canal:", error);
                                }
                            }
                        }
                    } catch (error) {
                        Logger.error("[TempChannels] Error en voiceStateUpdate:", error);
                    }
                });

                console.log("[TempChannels] Event listener de voiceStateUpdate registrado");
            } catch (error) {
                console.error("[TempChannels] Error en onEnable:", error);
                Logger.error("[TempChannels] Error en onEnable:", error);
            }
        },

        dbService: require("../db.service"),
    });

    module.exports = plugin;
    console.log("[TempChannels] Bot plugin exportado exitosamente");
} catch (error) {
    console.error("[TempChannels] Error exportando bot plugin:", error);
    throw error;
}
