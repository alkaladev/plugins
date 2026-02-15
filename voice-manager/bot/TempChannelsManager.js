const { Logger } = require("strange-sdk/utils");

class TempChannelsManager {
    constructor(client, dbService) {
        this.client = client;
        this.db = dbService;
    }

    /**
     * Crea un canal temporal cuando alguien se conecta
     * @param {VoiceState} voiceState
     * @returns {Promise<void>}
     */
    async createTempChannel(voiceState) {
        if (!voiceState.channel) return;

        const { channel, guild, member } = voiceState;
        const settings = await this.db.getSettings(guild.id);

        // Buscar si este canal es un generador
        const generator = settings.generators.find((g) => g.sourceChannelId === channel.id);
        if (!generator) return;

        try {
            // Crear número secuencial para el nuevo canal
            const count = await this.db.getActiveChannelCount(channel.id);
            const channelNumber = count + 1;
            const tempChannelName = `${generator.namePrefix} ${channelNumber}`;

            // Crear el canal temporal
            const tempChannel = await guild.channels.create({
                name: tempChannelName,
                type: 2, // GUILD_VOICE
                parent: generator.parentCategoryId || channel.parentId,
                userLimit: generator.userLimit || 0,
            });

            // Registrar en la BD
            await this.db.addActiveChannel({
                channelId: tempChannel.id,
                guildId: guild.id,
                sourceChannelId: channel.id,
                namePrefix: generator.namePrefix,
                createdBy: member.id,
            });

            // Mover al usuario al nuevo canal
            await member.voice.setChannel(tempChannel);

            Logger.info(
                `[TempChannels] Canal temporal creado: ${tempChannelName} en ${guild.name}`,
            );
        } catch (error) {
            Logger.error(`[TempChannels] Error creando canal temporal:`, error);
        }
    }

    /**
     * Elimina canales temporales vacíos
     * @param {VoiceState} voiceState
     * @returns {Promise<void>}
     */
    async cleanupEmptyChannels(voiceState) {
        if (voiceState.channel?.id === voiceState.channelId) return;

        const { guild } = voiceState;
        const activeChannels = await this.db.getActiveChannels(guild.id);

        for (const activeChannel of activeChannels) {
            try {
                const channel = guild.channels.cache.get(activeChannel.channelId);

                if (!channel) {
                    // El canal ya no existe, eliminar del registro
                    await this.db.removeActiveChannel(activeChannel.channelId);
                    continue;
                }

                // Si el canal está vacío, eliminarlo
                if (channel.members.size === 0) {
                    await channel.delete();
                    await this.db.removeActiveChannel(activeChannel.channelId);

                    Logger.info(
                        `[TempChannels] Canal temporal eliminado: ${activeChannel.channelId}`,
                    );
                }
            } catch (error) {
                Logger.error(`[TempChannels] Error limpiando canales:`, error);
            }
        }
    }

    /**
     * Obtiene información de canales temporales de un guild
     * @param {string} guildId
     * @returns {Promise<Array>}
     */
    async getChannelInfo(guildId) {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) return [];

        const activeChannels = await this.db.getActiveChannels(guildId);

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
    }
}

module.exports = TempChannelsManager;
