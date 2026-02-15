const router = require("express").Router();
const path = require("path");
const dbService = require(path.join(__dirname, "../db.service"));

console.log("[TempChannels Router] Router iniciado");

// GET - Obtener configuración del plugin para el servidor
router.get("/", async (req, res) => {
    try {
        console.log("[TempChannels Router] GET / llamado");
        const guildId = res.locals.guild.id;
        console.log("[TempChannels Router] Guild ID:", guildId);
        
        const settings = await dbService.getSettings(guildId);
        console.log("[TempChannels Router] Configuración obtenida:", settings);
        
        res.json(settings);
    } catch (error) {
        console.error("[TempChannels Router] Error en GET /:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST - Crear nuevo generador
router.post("/generator", async (req, res) => {
    try {
        console.log("[TempChannels Router] POST /generator llamado");
        const guildId = res.locals.guild.id;
        const { sourceChannelId, namePrefix, userLimit, parentCategoryId } = req.body;

        console.log("[TempChannels Router] Datos recibidos:", req.body);

        if (!sourceChannelId || !namePrefix) {
            return res.status(400).json({ error: "sourceChannelId y namePrefix requeridos" });
        }

        const generator = {
            sourceChannelId,
            namePrefix: namePrefix.trim(),
            userLimit: parseInt(userLimit) || 0,
            parentCategoryId: parentCategoryId || null,
        };

        const settings = await dbService.addGenerator(guildId, generator);
        console.log("[TempChannels Router] Generador añadido");
        
        res.json(settings);
    } catch (error) {
        console.error("[TempChannels Router] Error en POST /generator:", error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH - Editar generador
router.patch("/generator/:sourceChannelId", async (req, res) => {
    try {
        console.log("[TempChannels Router] PATCH /generator/:sourceChannelId llamado");
        const guildId = res.locals.guild.id;
        const { sourceChannelId } = req.params;
        const updates = req.body;

        console.log("[TempChannels Router] Editando generador:", sourceChannelId);

        if (updates.namePrefix) {
            updates.namePrefix = updates.namePrefix.trim();
        }
        if (updates.userLimit) {
            updates.userLimit = parseInt(updates.userLimit);
        }

        const settings = await dbService.updateGenerator(guildId, sourceChannelId, updates);
        console.log("[TempChannels Router] Generador actualizado");
        
        res.json(settings);
    } catch (error) {
        console.error("[TempChannels Router] Error en PATCH /generator:", error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE - Eliminar generador
router.delete("/generator/:sourceChannelId", async (req, res) => {
    try {
        console.log("[TempChannels Router] DELETE /generator/:sourceChannelId llamado");
        const guildId = res.locals.guild.id;
        const { sourceChannelId } = req.params;

        console.log("[TempChannels Router] Eliminando generador:", sourceChannelId);

        const settings = await dbService.deleteGenerator(guildId, sourceChannelId);
        console.log("[TempChannels Router] Generador eliminado");
        
        res.json(settings);
    } catch (error) {
        console.error("[TempChannels Router] Error en DELETE /generator:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET - Obtener canales activos
router.get("/active", async (req, res) => {
    try {
        console.log("[TempChannels Router] GET /active llamado");
        const guildId = res.locals.guild.id;
        
        const response = await req.broadcastOne("tempchannels:getActiveChannels", { guildId });
        console.log("[TempChannels Router] Canales activos obtenidos");
        
        res.json(response?.data || []);
    } catch (error) {
        console.error("[TempChannels Router] Error en GET /active:", error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE - Eliminar canal activo
router.delete("/channel/:channelId", async (req, res) => {
    try {
        console.log("[TempChannels Router] DELETE /channel/:channelId llamado");
        const guildId = res.locals.guild.id;
        const { channelId } = req.params;

        console.log("[TempChannels Router] Eliminando canal:", channelId);

        await req.broadcastOne("tempchannels:cleanupChannel", { guildId, channelId });
        console.log("[TempChannels Router] Canal eliminado");
        
        res.json({ success: true });
    } catch (error) {
        console.error("[TempChannels Router] Error en DELETE /channel:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
