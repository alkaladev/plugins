const router = require("express").Router();
const path = require("path");
const dbService = require(path.join(__dirname, "../db.service"));

// GET - Renderizar la vista del plugin
router.get("/", async (req, res) => {
    try {
        res.render(path.join(__dirname, "view.ejs"));
    } catch (error) {
        console.error("[TempChannels Router] Error renderizando vista:", error);
        res.status(500).send("Error renderizando vista");
    }
});

// POST - Crear nuevo generador
router.post("/generator", async (req, res) => {
    try {
        console.log("[TempChannels Router] POST /generator");
        const guildId = res.locals.guild.id;
        const { sourceChannelId, namePrefix, userLimit, parentCategoryId } = req.body;

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
        res.json(settings);
    } catch (error) {
        console.error("[TempChannels Router] Error POST /generator:", error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH - Editar generador
router.patch("/generator/:sourceChannelId", async (req, res) => {
    try {
        console.log("[TempChannels Router] PATCH /generator/:sourceChannelId");
        const guildId = res.locals.guild.id;
        const { sourceChannelId } = req.params;
        const updates = req.body;

        if (updates.namePrefix) {
            updates.namePrefix = updates.namePrefix.trim();
        }
        if (updates.userLimit) {
            updates.userLimit = parseInt(updates.userLimit);
        }

        const settings = await dbService.updateGenerator(guildId, sourceChannelId, updates);
        res.json(settings);
    } catch (error) {
        console.error("[TempChannels Router] Error PATCH /generator:", error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE - Eliminar generador
router.delete("/generator/:sourceChannelId", async (req, res) => {
    try {
        console.log("[TempChannels Router] DELETE /generator/:sourceChannelId");
        const guildId = res.locals.guild.id;
        const { sourceChannelId } = req.params;

        const settings = await dbService.deleteGenerator(guildId, sourceChannelId);
        res.json(settings);
    } catch (error) {
        console.error("[TempChannels Router] Error DELETE /generator:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET - Obtener canales activos
router.get("/active", async (req, res) => {
    try {
        console.log("[TempChannels Router] GET /active");
        const guildId = res.locals.guild.id;
        
        const response = await req.broadcastOne("tempchannels:getActiveChannels", { guildId });
        res.json(response?.data || []);
    } catch (error) {
        console.error("[TempChannels Router] Error GET /active:", error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE - Eliminar canal activo
router.delete("/channel/:channelId", async (req, res) => {
    try {
        console.log("[TempChannels Router] DELETE /channel/:channelId");
        const guildId = res.locals.guild.id;
        const { channelId } = req.params;

        await req.broadcastOne("tempchannels:cleanupChannel", { guildId, channelId });
        res.json({ success: true });
    } catch (error) {
        console.error("[TempChannels Router] Error DELETE /channel:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
