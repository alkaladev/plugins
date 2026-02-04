const { DBService, Schema } = require("strange-sdk");

class EmbedService extends DBService {
    constructor() {
        super(__dirname);
    }

    defineSchemas(_config) {
        return {
            settings: new Schema({
                _id: String, // Guild ID
                embed: {
                    title: String,
                    description: String,
                    color: { type: String, default: "#2f3136" },
                    image: String,
                    thumbnail: String,
                    fields: [
                        {
                            _id: false,
                            name: String,
                            value: String,
                            inline: { type: Boolean, default: false },
                        },
                    ],
                    footer: {
                        _id: false,
                        text: String,
                        iconURL: String,
                    },
                    author: {
                        _id: false,
                        name: String,
                        iconURL: String,
                    },
                    timestamp: { type: Boolean, default: false },
                },
            }),
        };
    }
}

module.exports = new EmbedService();