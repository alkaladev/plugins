const path = require("node:path");
const router = require("express").Router();
const db = require("../db.service");

router.get("/", async (req, res) => {
    const guildId = res.locals.guild.id;
    
    // Obtenemos canales del bot vía IPC (como en tu ejemplo de Giveaways)
    const channelsResp = await req.broadcastOne("getChannelsOf", { guildId }, { guildId });
    const settings = await db.getSettings(guildId);

    res.render(path.join(__dirname, "views/settings.ejs"), {
        channels: channelsResp?.data || [],
        settings
    });
});

router.put("/", async (req, res) => {
    const guildId = res.locals.guild.id;
    const settings = await db.getSettings(guildId);
    const body = req.body;

    if (body.ai_channel !== undefined) settings.ai_channel = body.ai_channel;
    if (body.enabled !== undefined) settings.enabled = body.enabled;

    await settings.save();
    res.json({ success: true });
});

module.exports = router;