const { DBService, Schema } = require("strange-sdk");

class GeminiService extends DBService {
    constructor() {
        super(__dirname);
    }

    /**
     * Define los esquemas de la base de datos para el plugin.
     * @param {Object} config - Configuración global del plugin (desde admin)
     */
    defineSchemas(config) {
        return {
            settings: new Schema({
                _id: String, // El ID del servidor (Guild ID)
                enabled: {
                    type: Boolean,
                    default: false, // Desactivado por defecto al invitar al bot
                },
                ai_channel: {
                    type: String,
                    default: null, // Si es null, podrías hacer que solo responda a menciones
                },
                // Opcional: puedes añadir un campo para "personalidad" por servidor
                system_instruction: {
                    type: String,
                    default: "Eres un asistente servicial en un servidor de Discord.",
                }
            }),
        };
    }

    /**
     * Obtiene o crea la configuración de un servidor específico.
     * @param {string} guildId 
     */
    async getSettings(guildId) {
        let settings = await this.models.settings.findById(guildId);
        if (!settings) {
            settings = await this.models.settings.create({ _id: guildId });
        }
        return settings;
    }
}

module.exports = new GeminiService();