const router = require("express").Router();
const dbService = require("../../db.service");
const { Logger } = require("strange-sdk/utils");

/**
 * GET /temp-channels/settings
 */
router.get("/settings", async (req, res) => {
    try {
        const guildId = res.locals.guild.id;
        const settings = await dbService.getSettings(guildId);
        res.json({ success: true, data: settings });
    } catch (error) {
        Logger.error("[TempChannels API] Error en GET /settings:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /temp-channels/generator
 */
router.post("/generator", async (req, res) => {
    try {
        const guildId = res.locals.guild.id;
        const { sourceChannelId, namePrefix, userLimit, parentCategoryId } = req.body;

        if (!sourceChannelId || !namePrefix) {
            return res.status(400).json({
                success: false,
                error: "sourceChannelId y namePrefix son requeridos",
            });
        }

        const generator = {
            sourceChannelId,
            namePrefix: namePrefix.trim(),
            userLimit: parseInt(userLimit) || 0,
            parentCategoryId: parentCategoryId || null,
        };

        const settings = await dbService.addGenerator(guildId, generator);
        res.json({ success: true, data: settings });
    } catch (error) {
        Logger.error("[TempChannels API] Error en POST /generator:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PATCH /temp-channels/generator/:sourceChannelId
 */
router.patch("/generator/:sourceChannelId", async (req, res) => {
    try {
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
        res.json({ success: true, data: settings });
    } catch (error) {
        Logger.error("[TempChannels API] Error en PATCH /generator:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /temp-channels/generator/:sourceChannelId
 */
router.delete("/generator/:sourceChannelId", async (req, res) => {
    try {
        const guildId = res.locals.guild.id;
        const { sourceChannelId } = req.params;

        const settings = await dbService.deleteGenerator(guildId, sourceChannelId);
        res.json({ success: true, data: settings });
    } catch (error) {
        Logger.error("[TempChannels API] Error en DELETE /generator:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /temp-channels/active
 */
router.get("/active", async (req, res) => {
    try {
        const guildId = res.locals.guild.id;

        const response = await req.broadcastOne("tempchannels:getActiveChannels", {
            guildId,
        });

        if (response?.success) {
            res.json({ success: true, data: response.data });
        } else {
            res.json({ success: false, error: "Error obteniendo canales activos" });
        }
    } catch (error) {
        Logger.error("[TempChannels API] Error en GET /active:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /temp-channels/channel/:channelId
 */
router.delete("/channel/:channelId", async (req, res) => {
    try {
        const guildId = res.locals.guild.id;
        const { channelId } = req.params;

        const response = await req.broadcastOne("tempchannels:cleanupChannel", {
            guildId,
            channelId,
        });

        if (response?.success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ success: false, error: response?.error || "Error eliminando canal" });
        }
    } catch (error) {
        Logger.error("[TempChannels API] Error en DELETE /channel:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
