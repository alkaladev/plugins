const path   = require("node:path");
const router = require("express").Router();
const db     = require("../db.service");

router.get("/", async (req, res) => {
    const config = await db.getGlobalConfig();
    res.render(path.join(__dirname, "views/admin.ejs"), { config });
});

router.put("/", async (req, res) => {
    const config = await db.getGlobalConfig();
    const { twitch_client_id, twitch_client_secret } = req.body;
    if (twitch_client_id     !== undefined) config.twitch_client_id     = twitch_client_id.trim();
    if (twitch_client_secret !== undefined) config.twitch_client_secret = twitch_client_secret.trim();
    await config.save();
    res.json({ success: true });
});

module.exports = router;
