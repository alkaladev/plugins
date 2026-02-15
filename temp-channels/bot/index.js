const { BotPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");

module.exports = new BotPlugin({
    dependencies: [],
    baseDir: __dirname,

    async enable(client) {
        Logger.info("[TempChannels] Plugin habilitado");

        // Obtener el servicio de BD (se cargar automáticamente)
        const dbService = require("../db.service");

        // Escuchar cambios en canales de voz
        client.on("voiceStateUpdate", async (oldState, newState) => {
            try {
                const { channel, member, guild } = newState;

                // Usuario se conectó a un canal
                if (!oldState.channel && channel) {
                    await handleUserConnect(client, member, channel, guild, dbService);
                }
                // Usuario se desconectó o cambió de canal
                else if (oldState.channel && (!channel || oldState.channel.id !== channel?.id)) {
                    await cleanupEmptyChannels(oldState.guild, oldState.channel, dbService);
                }
            } catch (error) {
                Logger.error("[TempChannels] Error en voiceStateUpdate:", error);
            }
        });

        // Registrar eventos IPC para el dashboard
        this.ipcEvents = new Map();

        this.ipcEvents.set("getSettings", async (payload) => {
            const { guildId } = payload;
            return await dbService.getSettings(guildId);
        });

        this.ipcEvents.set("addGenerator", async (payload) => {
            const { guildId, generator } = payload;
            return await dbService.addGenerator(guildId, generator);
        });

        this.ipcEvents.set("updateGenerator", async (payload) => {
            const { guildId, sourceChannelId, updates } = payload;
            return await dbService.updateGenerator(guildId, sourceChannelId, updates);
        });

        this.ipcEvents.set("deleteGenerator", async (payload) => {
            const { guildId, sourceChannelId } = payload;
            return await dbService.deleteGenerator(guildId, sourceChannelId);
        });

        this.ipcEvents.set("getActiveChannels", async (payload) => {
            const { guildId } = payload;
            return await getChannelInfo(client, guildId, dbService);
        });

        this.ipcEvents.set("cleanupChannel", async (payload) => {
            const { guildId, channelId } = payload;
            try {
                const guild = client.guilds.cache.get(guildId);
                if (!guild) throw new Error("Guild no encontrado");

                const channel = guild.channels.cache.get(channelId);
                if (channel) {
                    await channel.delete();
                    await dbService.removeActiveChannel(channelId);
                }
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        return true;
    },

    async disable() {
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

/**
 * Manejar cuando un usuario se conecta
 */
async function handleUserConnect(client, member, channel, guild, dbService) {
    const settings = await dbService.getSettings(guild.id);
    
    // Buscar si este canal es un generador
    const generator = settings.generators.find((g) => g.sourceChannelId === channel.id);
    if (!generator) return;

    try {
        // Contar canales activos para este generador
        const count = await dbService.getActiveChannelCount(channel.id);
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
        await dbService.addActiveChannel({
            channelId: tempChannel.id,
            guildId: guild.id,
            sourceChannelId: channel.id,
            namePrefix: generator.namePrefix,
            createdBy: member.id,
        });

        // Mover al usuario al nuevo canal
        await member.voice.setChannel(tempChannel);

        Logger.info(`[TempChannels] Canal temporal creado: ${tempChannelName} en ${guild.name}`);
    } catch (error) {
        Logger.error(`[TempChannels] Error creando canal temporal:`, error);
    }
}

/**
 * Limpiar canales vacíos
 */
async function cleanupEmptyChannels(guild, oldChannel, dbService) {
    if (!guild) return;

    try {
        const activeChannels = await dbService.getActiveChannels(guild.id);

        for (const activeChannel of activeChannels) {
            try {
                const channel = guild.channels.cache.get(activeChannel.channelId);

                if (!channel) {
                    await dbService.removeActiveChannel(activeChannel.channelId);
                    continue;
                }

                // Si el canal está vacío, eliminarlo
                if (channel.members.size === 0) {
                    await channel.delete();
                    await dbService.removeActiveChannel(activeChannel.channelId);
                    Logger.info(`[TempChannels] Canal temporal eliminado: ${channel.name}`);
                }
            } catch (error) {
                Logger.error(`[TempChannels] Error limpiando canal:`, error);
            }
        }
    } catch (error) {
        Logger.error(`[TempChannels] Error en cleanupEmptyChannels:`, error);
    }
}

/**
 * Obtener información de canales activos
 */
async function getChannelInfo(client, guildId, dbService) {
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
}
