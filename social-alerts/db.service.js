const { DBService, Schema } = require("strange-sdk");

class SocialAlertsService extends DBService {
    constructor() {
        super(__dirname);
    }

    defineSchemas(_config) {
        return {
            settings: new Schema({
                _id: String,

                twitch: {
                    _id: false,
                    enabled:   { type: Boolean, default: false },
                    channel:   { type: String,  default: null  },
                    streamers: { type: [{ _id: false, username: String, message: String }], default: [] },
                    mention:   { type: String,  default: null  }, // rol a mencionar
                },

                youtube: {
                    _id: false,
                    enabled:   { type: Boolean, default: false },
                    channel:   { type: String,  default: null  },
                    channels:  { type: [{ _id: false, id: String, name: String, message: String }], default: [] },
                    mention:   { type: String,  default: null  },
                },

                twitter: {
                    _id: false,
                    enabled:  { type: Boolean, default: false },
                    channel:  { type: String,  default: null  },
                    accounts: { type: [{ _id: false, username: String, message: String }], default: [] },
                    mention:  { type: String,  default: null  },
                },

                instagram: {
                    _id: false,
                    enabled:  { type: Boolean, default: false },
                    channel:  { type: String,  default: null  },
                    accounts: { type: [{ _id: false, username: String, message: String }], default: [] },
                    mention:  { type: String,  default: null  },
                },
            }),

            // Almacena los últimos posts/streams vistos para no repetir
            seenCache: new Schema({
                _id:      String,  // guildId:platform:username
                last_id:  { type: String, default: null },
                live:     { type: Boolean, default: false },
                updated:  { type: Date, default: Date.now },
            }),

            // Config global: Twitch Client ID/Secret
            globalConfig: new Schema({
                _id:            { type: String, default: "global" },
                twitch_client_id:     { type: String, default: "" },
                twitch_client_secret: { type: String, default: "" },
            }),
        };
    }

    async getSettings(guild) {
        const guildId = typeof guild === "string" ? guild : guild.id;
        const Model = this.getModel("settings");
        let s = await Model.findById(guildId);
        if (!s) s = await Model.create({ _id: guildId });
        return s;
    }

    async getGlobalConfig() {
        const Model = this.getModel("globalConfig");
        let cfg = await Model.findById("global");
        if (!cfg) cfg = await Model.create({ _id: "global" });
        return cfg;
    }

    async getSeen(key) {
        const Model = this.getModel("seenCache");
        return Model.findById(key);
    }

    async setSeen(key, data) {
        const Model = this.getModel("seenCache");
        return Model.findByIdAndUpdate(key, { ...data, updated: Date.now() }, { upsert: true, new: true });
    }

    async getAllSettings() {
        return this.getModel("settings").find({ $or: [
            { "twitch.enabled": true },
            { "youtube.enabled": true },
            { "twitter.enabled": true },
            { "instagram.enabled": true },
        ]});
    }
}

module.exports = new SocialAlertsService();
