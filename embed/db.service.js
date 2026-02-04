const { DBService, Schema } = require("strange-sdk");

class EmbedService extends DBService {
    constructor() {
        super(__dirname);
    }

    defineSchemas(_config) {
        return {
            settings: new Schema({
                _id: String,
                embed: {
                    title: { type: String, default: "" },
                    description: { type: String, default: "" },
                    color: { type: String, default: "#2f3136" },
                    image: String,
                    thumbnail: String,
                    fields: { type: Array, default: [] },
                    // IMPORTANTE: Definir sub-objetos para evitar errores de undefined
                    footer: { 
                        text: { type: String, default: "" }, 
                        iconURL: { type: String, default: "" } 
                    },
                    author: { 
                        name: { type: String, default: "" }, 
                        iconURL: { type: String, default: "" } 
                    },
                    timestamp: { type: Boolean, default: false }
                }
            }),
        };
    }
}

module.exports = new EmbedService();