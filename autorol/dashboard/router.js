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

        res.render(path.join(__dirname, "view.ejs"), {
            settings: settings || {},
            messages: (settings && settings.messages) || []
        });
    } catch (error) {
        console.error("[Autorol Router] Error renderizando vista:", error);
        res.status(500).send("Error renderizando vista: " + error.message);
    }
});

// GET /api/settings - Obtener configuración
router.get("/api/settings", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        
        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }
        
        const settings = await db.getSettings(guildId);
        res.json(settings);
    } catch (error) {
        console.error("[Autorol Router] Error obteniendo settings:", error);
        res.status(500).json({ error: "Error obteniendo settings" });
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

// POST /api/messages - Crear nuevo embed
router.post("/api/messages", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        const { title, description, color, footer } = req.body;
        
        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }
        
        if (!title || !description) {
            return res.status(400).json({ error: "Title and description required" });
        }
        
        const messageData = {
            messageId: Date.now().toString(),
            channelId: req.body.channelId || "",
            title,
            description,
            color: color || "#2f3136",
            footer: footer || null,
            buttons: []
        };
        
        await db.addMessage(guildId, messageData);
        res.json({ success: true, data: messageData });
    } catch (error) {
        console.error("[Autorol Router] Error creando mensaje:", error);
        res.status(500).json({ error: "Error creando mensaje" });
    }
});

// PUT /api/messages/:messageId - Editar embed
router.put("/api/messages/:messageId", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        const messageId = req.params.messageId;
        const { title, description, color, footer } = req.body;
        
        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }
        
        const updates = {};
        if (title) updates.title = title;
        if (description) updates.description = description;
        if (color) updates.color = color;
        if (footer !== undefined) updates.footer = footer;
        
        await db.updateMessage(guildId, messageId, updates);
        res.json({ success: true });
    } catch (error) {
        console.error("[Autorol Router] Error actualizando mensaje:", error);
        res.status(500).json({ error: "Error actualizando mensaje" });
    }
});

// POST /api/messages/:messageId/buttons - Añadir botón
router.post("/api/messages/:messageId/buttons", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        const messageId = req.params.messageId;
        const { roleId, label, emoji, style } = req.body;
        
        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }
        
        if (!roleId || !label) {
            return res.status(400).json({ error: "roleId and label required" });
        }
        
        await db.addButton(guildId, messageId, {
            roleId,
            label,
            emoji: emoji || null,
            style: style || "Primary"
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error("[Autorol Router] Error añadiendo botón:", error);
        res.status(500).json({ error: "Error añadiendo botón" });
    }
});

// DELETE /api/messages/:messageId/buttons/:roleId - Remover botón
router.delete("/api/messages/:messageId/buttons/:roleId", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        const messageId = req.params.messageId;
        const roleId = req.params.roleId;
        
        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }
        
        await db.removeButton(guildId, messageId, roleId);
        res.json({ success: true });
    } catch (error) {
        console.error("[Autorol Router] Error removiendo botón:", error);
        res.status(500).json({ error: "Error removiendo botón" });
    }
});

module.exports = router;
