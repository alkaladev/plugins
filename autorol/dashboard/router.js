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
        
        // Obtener canales
        const channelsResponse = await req.broadcastOne("getChannelsOf", guildId, { guildId });
        const channels = (channelsResponse && channelsResponse.data) || [];
        const textChannels = Array.isArray(channels) ? channels.filter(c => c.type === 0) : [];
        
        // Obtener roles
        const rolesResponse = await req.broadcastOne("getRolesOf", guildId, { guildId });
        const roles = (rolesResponse && rolesResponse.data) || [];
        
        // Obtener embeds guardados
        const settings = await db.getSettings(guildId);
        const messages = (settings && settings.messages) || [];
        
        res.render(path.join(__dirname, "view.ejs"), {
            messages,
            channels: textChannels,
            roles,
            settings: settings || {},
            coreConfig: res.locals.coreConfig || {},
            settingsTab: false,
            tabs: ["Constructor de Embed", "Gestionar Embeds"],
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
        const { titulo, descripcion, color, embed_channel } = req.body;
        
        console.log("[Autorol] Recibido:", { titulo, descripcion, color, embed_channel });
        
        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }

        if (!titulo || !descripcion) {
            return res.status(400).json({ error: "Título y descripción requeridos" });
        }
        
        const messageData = {
            messageId: Date.now().toString(),
            channelId: embed_channel || "0", // Usar "0" si no se proporciona
            title: titulo,
            description: descripcion,
            color: color || "#5865F2",
            footer: null,
            buttons: []
        };
        
        console.log("[Autorol] MessageData a guardar:", messageData);
        
        await db.addMessage(guildId, messageData);
        res.json({ success: true, data: messageData });
    } catch (error) {
        console.error("[Autorol Router] Error creando mensaje:", error);
        res.status(500).json({ error: "Error creando mensaje: " + error.message });
    }
});

// POST /api/messages/:messageId/send - Enviar embed al canal de Discord
router.post("/api/messages/:messageId/send", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        const messageId = req.params.messageId;

        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }

        const settings = await db.getSettings(guildId);
        const messageData = settings.messages.find(m => m.messageId === messageId);

        if (!messageData) {
            return res.status(404).json({ error: "Embed no encontrado" });
        }

        if (!messageData.channelId || messageData.channelId === "0") {
            return res.status(400).json({ error: "El embed no tiene un canal asignado" });
        }

        // Usar IPC para comunicarse con el bot (formato pluginName:eventName)
        const ipcPayload = {
            guildId,
            messageData: messageData.toObject ? messageData.toObject() : JSON.parse(JSON.stringify(messageData)),
        };
        console.log("[Autorol DEBUG ROUTER] Enviando IPC payload:", JSON.stringify(ipcPayload, null, 2));

        // broadcastOne(event, payload) — el payload completo va en el segundo argumento
        const response = await req.broadcastOne("autorol:sendAutorolMessage", ipcPayload);
        console.log("[Autorol DEBUG ROUTER] Respuesta IPC:", JSON.stringify(response, null, 2));

        if (!response || !response.success) {
            throw new Error(response?.error || "El bot no pudo enviar el mensaje");
        }

        const discordMessageId = response.data?.discordMessageId;

        // Actualizar el messageId en la DB con el ID real de Discord
        if (discordMessageId && discordMessageId !== messageId) {
            const msg = settings.messages.find(m => m.messageId === messageId);
            if (msg) {
                msg.messageId = discordMessageId;
                msg.updatedAt = new Date();
                await settings.save();
            }
        }

        res.json({ success: true, discordMessageId });

    } catch (error) {
        console.error("[Autorol Router] Error enviando embed:", error);
        res.status(500).json({ error: "Error enviando embed: " + error.message });
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

// POST /api/messages/:messageId/buttons - Agregar botón
router.post("/api/messages/:messageId/buttons", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        const messageId = req.params.messageId;
        const { roleId, label, emoji, style } = req.body;

        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }

        if (!roleId || !label) {
            return res.status(400).json({ error: "roleId y label requeridos" });
        }

        await db.addButton(guildId, messageId, {
            roleId,
            label,
            emoji: emoji || null,
            style: style || "Primary"
        });

        res.json({ success: true });
    } catch (error) {
        console.error("[Autorol Router] Error agregando botón:", error);
        res.status(500).json({ error: "Error agregando botón" });
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
