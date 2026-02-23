const path   = require("node:path");
const router = require("express").Router();
const db     = require("../db.service");

// Categorias validas
const CATEGORIES = ["channels", "server", "members", "messages", "voice", "moderation", "threads", "invites", "roles"];

router.get("/", async (req, res) => {
    const guildId = res.locals.guild.id;
    const [channelsResp] = await Promise.all([
        req.broadcastOne("getChannelsOf", { guildId }, { guildId }),
    ]);
    const settings = await db.getSettings(guildId);
    res.render(path.join(__dirname, "views/settings.ejs"), {
        channels: channelsResp?.data || [],
        settings,
        tabs: ["Canales", "Servidor", "Miembros", "Mensajes", "Voz", "Moderación", "Hilos", "Invitaciones", "Roles"],
    });
});

router.put("/", async (req, res) => {
    const guildId  = res.locals.guild.id;
    const settings = await db.getSettings(guildId);
    const { category, field, value } = req.body;

    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: "Categoría inválida" });
    if (!settings[category]) settings[category] = {};

    // field puede ser: "enabled", "channel", "color", o "events.eventName"
    if (field === "enabled" || field === "channel" || field === "color") {
        settings[category][field] = value ?? null;
    } else if (field && field.startsWith("events.")) {
        const eventKey = field.replace("events.", "");
        if (!settings[category].events) settings[category].events = {};
        settings[category].events[eventKey] = value;
    }

    settings.markModified(category);
    await settings.save();
    res.json({ success: true });
});

module.exports = router;
