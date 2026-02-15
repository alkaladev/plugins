const { DBService, Schema } = require("strange-sdk");

class TempChannelsService extends DBService {
    constructor() {
        super("temp-channels", __dirname);
    }

    defineSchemas() {
        return {
            // Configuración de generadores por guild
            settings: new Schema({
                guildId: { type: String, required: true, unique: true },
                generators: [
                    {
                        sourceChannelId: String, // ID del canal de voz que genera temporales
                        namePrefix: String, // Prefijo para los nombres (ej: "Patrulla", "Squad")
                        userLimit: Number, // Límite de usuarios (0 = ilimitado)
                        order: { type: Number, default: 0 }, // Orden en la configuración
                        parentCategoryId: String, // Categoría donde se crean los canales
                        createdAt: { type: Date, default: Date.now },
                    },
                ],
            }),

            // Registro de canales temporales activos
            activeChannels: new Schema({
                channelId: { type: String, required: true, unique: true },
                guildId: { type: String, required: true },
                sourceChannelId: String, // De cuál canal generador proviene
                namePrefix: String,
                createdAt: { type: Date, default: Date.now },
                createdBy: String, // ID del usuario que lo creó
            }),
        };
    }

    /**
     * Obtiene la configuración de un guild
     * @param {string} guildId
     * @returns {Promise<Object>}
     */
    async getSettings(guildId) {
        const SettingsModel = this.getModel("settings");
        let settings = await SettingsModel.findOne({ guildId });
        if (!settings) {
            settings = await SettingsModel.create({ guildId, generators: [] });
        }
        return settings;
    }

    /**
     * Añade un generador de canales
     * @param {string} guildId
     * @param {Object} generator
     * @returns {Promise<Object>}
     */
    async addGenerator(guildId, generator) {
        const SettingsModel = this.getModel("settings");
        const settings = await this.getSettings(guildId);

        const newGenerator = {
            ...generator,
            order: settings.generators.length,
            createdAt: new Date(),
        };

        settings.generators.push(newGenerator);
        await settings.save();
        return settings;
    }

    /**
     * Actualiza un generador
     * @param {string} guildId
     * @param {string} sourceChannelId
     * @param {Object} updates
     * @returns {Promise<Object>}
     */
    async updateGenerator(guildId, sourceChannelId, updates) {
        const SettingsModel = this.getModel("settings");
        const settings = await this.getSettings(guildId);

        const generator = settings.generators.find((g) => g.sourceChannelId === sourceChannelId);
        if (!generator) throw new Error("Generador no encontrado");

        Object.assign(generator, updates);
        await settings.save();
        return settings;
    }

    /**
     * Elimina un generador
     * @param {string} guildId
     * @param {string} sourceChannelId
     * @returns {Promise<Object>}
     */
    async deleteGenerator(guildId, sourceChannelId) {
        const SettingsModel = this.getModel("settings");
        const settings = await this.getSettings(guildId);

        settings.generators = settings.generators.filter(
            (g) => g.sourceChannelId !== sourceChannelId,
        );
        await settings.save();
        return settings;
    }

    /**
     * Registra un canal temporal creado
     * @param {Object} channelData
     * @returns {Promise<Object>}
     */
    async addActiveChannel(channelData) {
        const ActiveChannelsModel = this.getModel("activeChannels");
        return await ActiveChannelsModel.create(channelData);
    }

    /**
     * Obtiene canales temporales activos de un guild
     * @param {string} guildId
     * @returns {Promise<Array>}
     */
    async getActiveChannels(guildId) {
        const ActiveChannelsModel = this.getModel("activeChannels");
        return await ActiveChannelsModel.find({ guildId });
    }

    /**
     * Elimina un canal temporal del registro
     * @param {string} channelId
     * @returns {Promise<Object>}
     */
    async removeActiveChannel(channelId) {
        const ActiveChannelsModel = this.getModel("activeChannels");
        return await ActiveChannelsModel.findByIdAndDelete(
            { channelId },
            { new: true },
        );
    }

    /**
     * Obtiene el número de canales activos para un generador
     * @param {string} sourceChannelId
     * @returns {Promise<number>}
     */
    async getActiveChannelCount(sourceChannelId) {
        const ActiveChannelsModel = this.getModel("activeChannels");
        return await ActiveChannelsModel.countDocuments({ sourceChannelId });
    }
}

module.exports = new TempChannelsService();
