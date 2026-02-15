const { BotPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");

module.exports = new BotPlugin({
    dependencies: [],
    baseDir: __dirname,

    async enable(client) {
        Logger.info("[TempChannels] Plugin habilitado");

        const dbService = require("../db.service");

        // Escuchar cambios en canales de voz
        client.on("voiceStateUpdate", async (oldState, newState) => {
            try {
                const { channel, member, guild } = newState;

                if (!oldState.channel && channel) {
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

        // Registrar eventos IPC para el dashboard
        this.ipcEvents = new Map();

        this.ipcEvents.set("getSettings", async (payload) => {
            try {
                const { guildId } = payload;
                return await dbService.getSettings(guildId);
            } catch (error) {
                Logger.error("[TempChannels IPC] Error:", error);
                throw error;
            }
        });

        this.ipcEvents.set("addGenerator", async (payload) => {
            try {
                const { guildId, generator } = payload;
                return await dbService.addGenerator(guildId, generator);
            } catch (error) {
                Logger.error("[TempChannels IPC] Error:", error);
                throw error;
            }
        });

        this.ipcEvents.set("updateGenerator", async (payload) => {
            try {
                const { guildId, sourceChannelId, updates } = payload;
                return await dbService.updateGenerator(guildId, sourceChannelId, updates);
            } catch (error) {
                Logger.error("[TempChannels IPC] Error:", error);
                throw error;
            }
        });

        this.ipcEvents.set("deleteGenerator", async (payload) => {
            try {
                const { guildId, sourceChannelId } = payload;
                return await dbService.deleteGenerator(guildId, sourceChannelId);
            } catch (error) {
                Logger.error("[TempChannels IPC] Error:", error);
                throw error;
            }
        });

        this.ipcEvents.set("getActiveChannels", async (payload) => {
            try {
                const { guildId } = payload;
                const guild = client.guilds.cache.get(guildId);
                if (!guild) return [];

                const activeChannels = await dbService.getActiveChannels(guildId);
                return activeChannels.map((ac) => {
                    const channel = guild.channels.cache.get(ac.channelId);
                    return {
                        id: ac.channelId,
                        name: channel?.name || "Desconocido",
                        members: channel?.members.size || 0,
                        maxMembers: channel?.userLimit || 0,
                        createdAt: ac.createdAt,
                        isAlive: !!channel,
                    };
                });
            } catch (error) {
                Logger.error("[TempChannels IPC] Error:", error);
                throw error;
            }
        });

        this.ipcEvents.set("cleanupChannel", async (payload) => {
            try {
                const { guildId, channelId } = payload;
                const guild = client.guilds.cache.get(guildId);
                if (!guild) throw new Error("Guild no encontrado");

                const channel = guild.channels.cache.get(channelId);
                if (channel) {
                    await channel.delete();
                    await dbService.removeActiveChannel(channelId);
                }
                return { success: true };
            } catch (error) {
                Logger.error("[TempChannels IPC] Error:", error);
                return { success: false, error: error.message };
            }
        });

        return true;
    },

    async disable(client) {
        Logger.info("[TempChannels] Plugin deshabilitado");
        return true;
    },

    async onGuildEnable(guild) {
        Logger.info(`[TempChannels] Habilitado en guild: ${guild.name}`);
        return true;
    },

    async onGuildDisable(guild) {
        Logger.info(`[TempChannels] Deshabilitado en guild: ${guild.name}`);
        return true;
    },
});
