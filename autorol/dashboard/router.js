const express = require("express");
const path = require("path");
const db = require("../db.service");

const router = express.Router();

// Middleware CRÍTICO - Extraer guildId ANTES de cualquier otra ruta
router.use((req, res, next) => {
    const baseUrl = req.baseUrl;
    
    if (baseUrl) {
        const parts = baseUrl.split('/');
        const guildId = parts[2];
        res.locals.guildId = guildId;
    }
    next();
});

// Renderizar vista
router.get("/", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        
        if (!guildId) {
            return res.status(400).send("GuildId not found");
        }
        
        const settings = await db.getSettings(guildId);
        const messages = (settings && settings.messages) || [];

        res.render(path.join(__dirname, "view.ejs"), {
            messages: messages,
            settings: settings || {}
        });
    } catch (error) {
        console.error("[Autorol Router] Error renderizando vista:", error);
        res.status(500).send("Error renderizando vista: " + error.message);
    }
});

// GET /api/messages - Obtener mensajes/embeds
router.get("/api/messages", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        
        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }
        
        const settings = await db.getSettings(guildId);
        res.json(settings.messages || []);
    } catch (error) {
        console.error("[Autorol Router] Error obteniendo mensajes:", error);
        res.json([]);
    }
});

// POST /api/messages - Crear nuevo embed
router.post("/api/messages", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        const { titulo, descripcion, color } = req.body;
        
        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }
        
        if (!titulo || !descripcion) {
            return res.status(400).json({ error: "Título y descripción requeridos" });
        }
        
        const messageData = {
            messageId: Date.now().toString(),
            channelId: "",
            title: titulo,
            description: descripcion,
            color: color || "#5865F2",
            footer: null,
            buttons: []
        };
        
        await db.addMessage(guildId, messageData);
        res.json({ success: true, data: messageData });
    } catch (error) {
        console.error("[Autorol Router] Error creando mensaje:", error);
        res.status(500).json({ error: "Error creando mensaje" });
    }
});

// DELETE /api/messages/:messageId - Eliminar embed
router.delete("/api/messages/:messageId", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        const messageId = req.params.messageId;
        
        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }
        
        await db.deleteMessage(guildId, messageId);
        res.json({ success: true });
    } catch (error) {
        console.error("[Autorol Router] Error eliminando mensaje:", error);
        res.status(500).json({ error: "Error eliminando mensaje" });
    }
});

module.exports = router;
