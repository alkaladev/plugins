const path   = require("node:path");
const router = require("express").Router();
const db     = require("../db.service");

router.get("/", async (req, res) => {
    const guildId = res.locals.guild.id;
    const [channelsResp, rolesResp] = await Promise.all([
        req.broadcastOne("getChannelsOf", { guildId }, { guildId }),
        req.broadcastOne("getRolesOf",    { guildId }, { guildId }),
    ]);
    const settings = await db.getSettings(guildId);
    res.render(path.join(__dirname, "views/settings.ejs"), {
        channels: channelsResp?.data || [],
        roles:    rolesResp?.data    || [],
        settings,
        tabs: ["YouTube", "Twitter", "Instagram"],
    });
});

router.put("/", async (req, res) => {
    const guildId  = res.locals.guild.id;
    const settings = await db.getSettings(guildId);
    const { platform, action, data } = req.body;

    const platforms = ["twitch", "youtube", "twitter", "instagram"];
    if (!platforms.includes(platform)) return res.status(400).json({ error: "Plataforma invalida" });

    if (!settings[platform]) settings[platform] = {};

    if (action === "update") {
        // Actualiza canal, enabled, mention
        if (data.channel  !== undefined) settings[platform].channel  = data.channel  || null;
        if (data.enabled  !== undefined) settings[platform].enabled  = data.enabled;
        if (data.mention  !== undefined) settings[platform].mention  = data.mention  || null;
        settings.markModified(platform);
    }

    if (action === "add") {
        // Añade streamer/canal/cuenta
        const list = platform === "youtube" ? "channels" : platform === "twitch" ? "streamers" : "accounts";
        if (!settings[platform][list]) settings[platform][list] = [];

        const key = platform === "youtube" ? "id" : "username";
        const exists = settings[platform][list].some(x => x[key]?.toLowerCase() === data[key]?.toLowerCase());
        if (exists) return res.json({ success: false, error: "Ya existe" });

        settings[platform][list].push(data);
        settings.markModified(platform);
    }

    if (action === "remove") {
        const list = platform === "youtube" ? "channels" : platform === "twitch" ? "streamers" : "accounts";
        const key  = platform === "youtube" ? "id" : "username";
        settings[platform][list] = (settings[platform][list] || []).filter(x => x[key] !== data[key]);
        settings.markModified(platform);
    }

    if (action === "update_message") {
        const list = platform === "youtube" ? "channels" : platform === "twitch" ? "streamers" : "accounts";
        const key  = platform === "youtube" ? "id" : "username";
        const item = (settings[platform][list] || []).find(x => x[key] === data[key]);
        if (item) item.message = data.message;
        settings.markModified(platform);
    }

    await settings.save();
    res.json({ success: true });
});

module.exports = router;
