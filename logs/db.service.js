const { DBService, Schema } = require("strange-sdk");

class GuildLoggerService extends DBService {
    constructor() {
        super(__dirname);
    }

    defineSchemas(_config) {
        // Sub-schema reutilizable para cada categoria de log
        const logCategory = (defaults = {}) => ({
            _id:     false,
            enabled: { type: Boolean, default: false },
            channel: { type: String,  default: null  },
            color:   { type: String,  default: defaults.color || "#5865F2" },
            // Toggles individuales por evento (se definen dinamicamente por categoria)
            events:  { type: Schema.Types.Mixed, default: {} },
        });

        return {
            settings: new Schema({
                _id: String,

                // Canales
                channels: {
                    _id:     false,
                    enabled: { type: Boolean, default: false },
                    channel: { type: String,  default: null  },
                    color:   { type: String,  default: "#5865F2" },
                    events: {
                        _id:              false,
                        channelCreate:    { type: Boolean, default: true },
                        channelDelete:    { type: Boolean, default: true },
                        channelUpdate:    { type: Boolean, default: true },
                        channelPermUpdate:{ type: Boolean, default: true },
                    },
                },

                // Servidor
                server: {
                    _id:     false,
                    enabled: { type: Boolean, default: false },
                    channel: { type: String,  default: null  },
                    color:   { type: String,  default: "#FEE75C" },
                    events: {
                        _id:              false,
                        guildUpdate:      { type: Boolean, default: true },
                        emojiCreate:      { type: Boolean, default: true },
                        emojiDelete:      { type: Boolean, default: true },
                        emojiUpdate:      { type: Boolean, default: true },
                        stickerCreate:    { type: Boolean, default: true },
                        stickerDelete:    { type: Boolean, default: true },
                        webhookCreate:    { type: Boolean, default: true },
                        webhookDelete:    { type: Boolean, default: true },
                    },
                },

                // Usuarios / Miembros
                members: {
                    _id:     false,
                    enabled: { type: Boolean, default: false },
                    channel: { type: String,  default: null  },
                    color:   { type: String,  default: "#57F287" },
                    events: {
                        _id:            false,
                        memberJoin:     { type: Boolean, default: true },
                        memberLeave:    { type: Boolean, default: true },
                        memberUpdate:   { type: Boolean, default: true },
                        userUpdate:     { type: Boolean, default: true },
                        nicknameChange: { type: Boolean, default: true },
                        timeoutAdd:     { type: Boolean, default: true },
                        timeoutRemove:  { type: Boolean, default: true },
                    },
                },

                // Mensajes
                messages: {
                    _id:     false,
                    enabled: { type: Boolean, default: false },
                    channel: { type: String,  default: null  },
                    color:   { type: String,  default: "#EB459E" },
                    events: {
                        _id:           false,
                        messageDelete: { type: Boolean, default: true },
                        messageBulkDelete: { type: Boolean, default: true },
                        messageUpdate: { type: Boolean, default: true },
                        messagePinned: { type: Boolean, default: true },
                    },
                },

                // Voz
                voice: {
                    _id:     false,
                    enabled: { type: Boolean, default: false },
                    channel: { type: String,  default: null  },
                    color:   { type: String,  default: "#ED4245" },
                    events: {
                        _id:          false,
                        voiceJoin:    { type: Boolean, default: true },
                        voiceLeave:   { type: Boolean, default: true },
                        voiceSwitch:  { type: Boolean, default: true },
                        voiceMute:    { type: Boolean, default: true },
                        voiceDeafen:  { type: Boolean, default: true },
                        voiceStream:  { type: Boolean, default: true },
                    },
                },

                // Baneos / Sanciones
                moderation: {
                    _id:     false,
                    enabled: { type: Boolean, default: false },
                    channel: { type: String,  default: null  },
                    color:   { type: String,  default: "#ED4245" },
                    events: {
                        _id:         false,
                        banAdd:      { type: Boolean, default: true },
                        banRemove:   { type: Boolean, default: true },
                        kickMember:  { type: Boolean, default: true },
                        warnAdd:     { type: Boolean, default: true },
                    },
                },

                // Hilos
                threads: {
                    _id:     false,
                    enabled: { type: Boolean, default: false },
                    channel: { type: String,  default: null  },
                    color:   { type: String,  default: "#9B59B6" },
                    events: {
                        _id:           false,
                        threadCreate:  { type: Boolean, default: true },
                        threadDelete:  { type: Boolean, default: true },
                        threadUpdate:  { type: Boolean, default: true },
                        threadArchive: { type: Boolean, default: true },
                    },
                },

                // Invitaciones
                invites: {
                    _id:     false,
                    enabled: { type: Boolean, default: false },
                    channel: { type: String,  default: null  },
                    color:   { type: String,  default: "#1ABC9C" },
                    events: {
                        _id:           false,
                        inviteCreate:  { type: Boolean, default: true },
                        inviteDelete:  { type: Boolean, default: true },
                        inviteUse:     { type: Boolean, default: true },
                    },
                },

                // Roles
                roles: {
                    _id:     false,
                    enabled: { type: Boolean, default: false },
                    channel: { type: String,  default: null  },
                    color:   { type: String,  default: "#E67E22" },
                    events: {
                        _id:              false,
                        roleCreate:       { type: Boolean, default: true },
                        roleDelete:       { type: Boolean, default: true },
                        roleUpdate:       { type: Boolean, default: true },
                        roleAssign:       { type: Boolean, default: true },
                        roleRemove:       { type: Boolean, default: true },
                    },
                },
            }),
        };
    }

    async getSettings(guild) {
        const guildId = typeof guild === "string" ? guild : guild.id;
        const Model   = this.getModel("settings");
        let s = await Model.findById(guildId);
        if (!s) s = await Model.create({ _id: guildId });
        return s;
    }
}

module.exports = new GuildLoggerService();
