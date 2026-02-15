const { DBService, Schema } = require("strange-sdk");

class VoiceService extends DBService {
    constructor() {
        // Pasamos el nombre del plugin y la ruta
        super("voice-manager", __dirname);
    }

    defineSchemas() {
        return {
            // El nombre de esta llave debe coincidir con getModel("settings")
            settings: new Schema({
                guildId: { type: String, required: true, unique: true },
                generators: [{
                    sourceId: String,   
                    namePrefix: String, 
                    userLimit: Number,  
                    order: { type: Number, default: 0 }
                }]
            }),
        };
    }

    async getSettings(guildId) {
        // Forzamos la inicialización si por alguna razón el SDK no lo hizo
        const SettingsModel = this.getModel("settings");
        
        let settings = await SettingsModel.findOne({ guildId });
        if (!settings) {
            settings = await SettingsModel.create({ 
                guildId, 
                generators: [] 
            });
        }
        return settings;
    }
}

module.exports = new VoiceService();