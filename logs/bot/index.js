const { BotPlugin } = require("strange-sdk");
const db = require("../db.service");

const plugin = new BotPlugin({
    dependencies: [],
    baseDir: __dirname,
    dbService: db,

    onEnable: async (botClient) => {
        console.log("[guild-logger] Plugin de logs activado.");

        // Importar y registrar todos los event handlers
        const events = [
            // Canales
            require("./events/discord/channels"),
            // Servidor
            require("./events/discord/server"),
            // Miembros
            require("./events/discord/members"),
            // Mensajes
            require("./events/discord/messages"),
            // Voz
            require("./events/discord/voice"),
            // Moderacion
            require("./events/discord/moderation"),
            // Hilos
            require("./events/discord/threads"),
            // Invitaciones
            require("./events/discord/invites"),
            // Roles
            require("./events/discord/roles"),
        ];

        for (const ev of events) {
            ev.register(botClient, db);
        }

        console.log("[guild-logger] Todos los eventos de log registrados.");
    },

    onDisable: async (botClient) => {
        console.log("[guild-logger] Plugin de logs desactivado.");
        // Los listeners se eliminan en cada modulo al llamar unregister
    },
});

module.exports = plugin;
