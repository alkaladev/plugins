const { BotPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");
const TempChannelsManager = require("../TempChannelsManager");
const dbService = require("../db.service");

module.exports = new BotPlugin({
    dependencies: [],
    baseDir: __dirname,
    dbService,

    async enable(client) {
        Logger.info("[TempChannels] Plugin habilitado");

        // Instanciar el manejador
        const tempChannelsManager = new TempChannelsManager(client, dbService);
        client.tempChannelsManager = tempChannelsManager;

        // Evento: Usuario se conecta a un canal de voz
        client.on("voiceStateUpdate", async (oldState, newState) => {
            try {
                // Si se conectó a un canal
                if (!oldState.channel && newState.channel) {
                    await tempChannelsManager.createTempChannel(newState);
                }
                // Si se desconectó o cambió de canal
                else if (oldState.channel && (!newState.channel || oldState.channel.id !== newState.channel.id)) {
                    await tempChannelsManager.cleanupEmptyChannels(oldState);
                }
            } catch (error) {
                Logger.error("[TempChannels] Error en voiceStateUpdate:", error);
            }
        });

        // Eventos para IPC (comunicación con el dashboard)
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
            return await tempChannelsManager.getChannelInfo(guildId);
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
    },

    async disable() {
        Logger.info("[TempChannels] Plugin deshabilitado");
    },
});
