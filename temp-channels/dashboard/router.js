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
        
        // Obtener canales usando broadcast
        const channelsResponse = await req.broadcastOne("getChannelsOf", guildId, { guildId });
        const settings = await db.getSettings(guildId);
        const activeChannels = await db.getActiveChannels(guildId);

        // El broadcast devuelve { success: true, data: [...] }
        const channels = (channelsResponse && channelsResponse.data) || [];
        
        // Filtrar canales en el servidor
        let voiceChannels = [];
        let categories = [];
        
        if (Array.isArray(channels)) {
            voiceChannels = channels.filter(c => c.type === 2);
            categories = channels.filter(c => c.type === 4);
        }

        res.render(path.join(__dirname, "view.ejs"), {
            voiceChannels: voiceChannels,
            categories: categories,
            settings: settings || {},
            activeChannels: activeChannels || []
        });
    } catch (error) {
        console.error("[TempChannels Router] Error renderizando vista:", error);
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
        console.error("[TempChannels Router] Error obteniendo settings:", error);
        res.status(500).json({ error: "Error obteniendo settings" });
    }
});

// GET /api/channels - Obtener canales del servidor
router.get("/api/channels", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        
        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }
        
        // Usar broadcast para obtener canales
        const channelsResponse = await req.broadcastOne("getChannelsOf", guildId, { guildId });
        const channels = (channelsResponse && channelsResponse.data) || [];
        res.json(channels);
    } catch (error) {
        console.error("[TempChannels Router] Error obteniendo canales:", error);
        res.json([]);
    }
});

// GET /api/active - Obtener canales activos
router.get("/api/active", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        
        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }
        
        let activeChannels = await db.getActiveChannels(guildId);
        activeChannels = activeChannels.map(ch => ({
            ...ch.toObject ? ch.toObject() : ch
        }));
        
        // Obtener información del cliente para resolver nombres de usuario
        const client = req.app.get('client');
        
        if (client) {
            const guild = client.guilds?.cache?.get(guildId);
            
            if (guild) {
                // Resolver los nombres de usuario y obtener miembros conectados
                for (let i = 0; i < activeChannels.length; i++) {
                    try {
                        // Obtener nombre del creador
                        const user = await client.users.fetch(activeChannels[i].createdBy);
                        activeChannels[i].createdByName = user.username;
                        activeChannels[i].createdByAvatar = user.avatar;
                        
                        // Obtener miembros conectados al canal
                        const channel = guild.channels.cache.get(activeChannels[i].channelId);
                        if (channel && channel.isVoiceBased?.()) {
                            const members = Array.from(channel.members.values()).map(member => ({
                                id: member.id,
                                username: member.user.username,
                                avatar: member.user.avatar,
                                isBot: member.user.bot,
                            }));
                            activeChannels[i].connectedMembers = members;
                            activeChannels[i].memberCount = members.length;
                        } else {
                            activeChannels[i].connectedMembers = [];
                            activeChannels[i].memberCount = 0;
                        }
                    } catch (e) {
                        activeChannels[i].createdByName = "Usuario desconocido";
                        activeChannels[i].createdByAvatar = null;
                        activeChannels[i].connectedMembers = [];
                        activeChannels[i].memberCount = 0;
                    }
                }
            } else {
                // Si no se puede obtener el gremio, llenar con datos por defecto
                for (let i = 0; i < activeChannels.length; i++) {
                    activeChannels[i].createdByName = activeChannels[i].createdBy;
                    activeChannels[i].createdByAvatar = null;
                    activeChannels[i].connectedMembers = [];
                    activeChannels[i].memberCount = 0;
                }
            }
        } else {
            // Si no hay cliente disponible, llenar con IDs
            for (let i = 0; i < activeChannels.length; i++) {
                activeChannels[i].createdByName = activeChannels[i].createdBy;
                activeChannels[i].createdByAvatar = null;
                activeChannels[i].connectedMembers = [];
                activeChannels[i].memberCount = 0;
            }
        }
        
        res.json(activeChannels);
    } catch (error) {
        console.error("[TempChannels Router] Error obteniendo canales activos:", error);
        res.status(500).json({ error: "Error obteniendo canales activos" });
    }
});

// POST /api/generator - Crear generador
router.post("/api/generator", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        const { sourceChannelId, nombres, limite, categoriaId } = req.body;

        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }

        const names = nombres.split(",").map(n => n.trim()).filter(n => n.length > 0);
        if (names.length === 0) {
            return res.status(400).json({ error: "No names provided" });
        }

        const settings = await db.getSettings(guildId);
        
        const exists = settings.generators.some(g => g.sourceChannelId === sourceChannelId);
        if (exists) {
            return res.status(400).json({ error: "Generator already exists" });
        }

        const generator = {
            sourceChannelId,
            namesList: names,
            currentNameIndex: 0,
            userLimit: parseInt(limite) || 0,
            parentCategoryId: categoriaId || null,
            createdAt: new Date()
        };

        settings.generators.push(generator);
        await settings.save();

        res.json({ success: true });
    } catch (error) {
        console.error("[TempChannels Router] Error creando generador:", error);
        res.status(500).json({ error: "Error creando generador" });
    }
});

// PATCH /api/generator/:id - Actualizar generador
router.patch("/api/generator/:id", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        const { id } = req.params;
        const { sourceChannelId, nombres, limite, categoriaId } = req.body;

        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }

        const settings = await db.getSettings(guildId);
        const generator = settings.generators.find(g => g.sourceChannelId === id);

        if (!generator) {
            return res.status(404).json({ error: "Generator not found" });
        }

        if (nombres) {
            const names = nombres.split(",").map(n => n.trim()).filter(n => n.length > 0);
            if (names.length > 0) {
                generator.namesList = names;
                generator.currentNameIndex = 0;
            }
        }

        if (limite !== undefined) {
            generator.userLimit = parseInt(limite) || 0;
        }

        if (categoriaId !== undefined) {
            generator.parentCategoryId = categoriaId || null;
        }

        await settings.save();
        res.json({ success: true });
    } catch (error) {
        console.error("[TempChannels Router] Error actualizando generador:", error);
        res.status(500).json({ error: "Error actualizando generador" });
    }
});

// DELETE /api/generator/:id - Eliminar generador
router.delete("/api/generator/:id", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        const { id } = req.params;

        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }

        const settings = await db.getSettings(guildId);
        settings.generators = settings.generators.filter(g => g.sourceChannelId !== id);
        await settings.save();

        res.json({ success: true });
    } catch (error) {
        console.error("[TempChannels Router] Error eliminando generador:", error);
        res.status(500).json({ error: "Error eliminando generador" });
    }
});

// PATCH /api/generator/:id/toggle - Toggle generador
router.patch("/api/generator/:id/toggle", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        const { id } = req.params;

        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }

        const settings = await db.toggleGenerator(guildId, id);
        res.json({ success: true, settings });
    } catch (error) {
        console.error("[TempChannels Router] Error toggling generador:", error);
        res.status(500).json({ error: "Error toggling generador" });
    }
});

// DELETE /api/channel/:id - Eliminar canal activo
router.delete("/api/channel/:id", async (req, res) => {
    try {
        const guildId = res.locals.guildId;
        const { id } = req.params;

        if (!guildId) {
            return res.status(400).json({ error: "GuildId not found" });
        }

        // Usar broadcast para eliminar el canal
        await req.broadcastOne("deleteChannel", guildId, { channelId: id, guildId });

        await db.removeActiveChannel(id);
        res.json({ success: true });
    } catch (error) {
        console.error("[TempChannels Router] Error eliminando canal:", error);
        res.status(500).json({ error: "Error eliminando canal" });
    }
});

module.exports = router;
