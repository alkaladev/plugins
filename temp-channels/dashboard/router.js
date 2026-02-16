const express = require("express");
const path = require("path");
const db = require("../db.service");

const router = express.Router();

// Renderizar vista
router.get("/", async (req, res) => {
    try {
        res.render(path.join(__dirname, "view.ejs"));
    } catch (error) {
        console.error("[TempChannels Router] Error renderizando vista:", error);
        res.status(500).send("Error renderizando vista");
    }
});

// GET /api/settings - Obtener configuración
router.get("/api/settings", async (req, res) => {
    try {
        const { guildId } = req.params;
        const settings = await db.getSettings(req.params.guildId || req.query.guildId);
        res.json(settings);
    } catch (error) {
        console.error("[TempChannels Router] Error obteniendo settings:", error);
        res.status(500).json({ error: "Error obteniendo settings" });
    }
});

// GET /api/channels - Obtener canales del servidor
router.get("/api/channels", async (req, res) => {
    try {
        const guild = req.client.guilds.cache.get(req.guildId);
        if (!guild) {
            return res.status(404).json({ error: "Guild not found" });
        }

        const channels = guild.channels.cache.map(ch => ({
            id: ch.id,
            name: ch.name,
            type: ch.type
        }));

        res.json(channels);
    } catch (error) {
        console.error("[TempChannels Router] Error obteniendo canales:", error);
        res.status(500).json({ error: "Error obteniendo canales" });
    }
});

// GET /api/active - Obtener canales activos
router.get("/api/active", async (req, res) => {
    try {
        const activeChannels = await db.getActiveChannels(req.guildId);
        res.json(activeChannels);
    } catch (error) {
        console.error("[TempChannels Router] Error obteniendo canales activos:", error);
        res.status(500).json({ error: "Error obteniendo canales activos" });
    }
});

// POST /api/generator - Crear generador
router.post("/api/generator", async (req, res) => {
    try {
        const { sourceChannelId, nombres, limite, categoriaId } = req.body;

        const names = nombres.split(",").map(n => n.trim()).filter(n => n.length > 0);
        if (names.length === 0) {
            return res.status(400).json({ error: "No names provided" });
        }

        const settings = await db.getSettings(req.guildId);
        
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
        const { id } = req.params;
        const { sourceChannelId, nombres, limite, categoriaId } = req.body;

        const settings = await db.getSettings(req.guildId);
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
        const { id } = req.params;

        const settings = await db.getSettings(req.guildId);
        settings.generators = settings.generators.filter(g => g.sourceChannelId !== id);
        await settings.save();

        res.json({ success: true });
    } catch (error) {
        console.error("[TempChannels Router] Error eliminando generador:", error);
        res.status(500).json({ error: "Error eliminando generador" });
    }
});

// DELETE /api/channel/:id - Eliminar canal activo
router.delete("/api/channel/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const guild = req.client.guilds.cache.get(req.guildId);

        if (guild) {
            const channel = guild.channels.cache.get(id);
            if (channel) {
                await channel.delete();
            }
        }

        await db.removeActiveChannel(id);
        res.json({ success: true });
    } catch (error) {
        console.error("[TempChannels Router] Error eliminando canal:", error);
        res.status(500).json({ error: "Error eliminando canal" });
    }
});

module.exports = router;
