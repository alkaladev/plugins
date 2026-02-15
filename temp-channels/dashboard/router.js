const router = require("express").Router();
const dbService = require("../../db.service");

router.get("/settings", async (req, res) => {
    try {
        const guildId = res.locals.guild.id;
        const settings = await dbService.getSettings(guildId);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/generator", async (req, res) => {
    try {
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
        res.status(500).json({ error: error.message });
    }
});

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
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete("/generator/:sourceChannelId", async (req, res) => {
    try {
        const guildId = res.locals.guild.id;
        const { sourceChannelId } = req.params;
        const settings = await dbService.deleteGenerator(guildId, sourceChannelId);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/active", async (req, res) => {
    try {
        const guildId = res.locals.guild.id;
        const response = await req.broadcastOne("tempchannels:getActiveChannels", { guildId });
        res.json(response?.data || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete("/channel/:channelId", async (req, res) => {
    try {
        const guildId = res.locals.guild.id;
        const { channelId } = req.params;
        await req.broadcastOne("tempchannels:cleanupChannel", { guildId, channelId });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
