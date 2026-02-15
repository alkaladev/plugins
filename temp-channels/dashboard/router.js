const path = require("path");
const router = require("express").Router();
const db = require("../db.service");

router.get("/", async (req, res) => {
    const guildId = res.locals.guild.id;
    const [channelsResp, settings] = await Promise.all([
        req.broadcastOne("dashboard:GET_GUILD_CHANNELS", { guildId }),
        db.getSettings(guildId),
    ]);
    
    // Filtrar solo canales de voz (Type 2)
    const voiceChannels = channelsResp.success ? channelsResp.data.filter(c => c.type === 2) : [];

    res.render(path.join(__dirname, "views/settings.ejs"), {
        channels: voiceChannels,
        settings,
    });
});

router.put("/", async (req, res) => {
    const settings = await db.getSettings(res.locals.guild.id);
    settings.generators = req.body.generators;
    await settings.save();
    res.sendStatus(200);
});

module.exports = router;