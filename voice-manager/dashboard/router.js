const router = require("express").Router();
const path = require("path");
const db = require("../db.service");

router.get("/", async (req, res) => {
    const guildId = res.locals.guild.id;
    
    // Obtenemos canales de voz del servidor mediante IPC
    const ipcResp = await req.broadcastOne("dashboard:getChannelsOf", { guildId });
    const settings = await db.getSettings(guildId);

    // Ordenamos por el campo 'order'
    const sortedGenerators = settings.generators.sort((a, b) => a.order - b.order);

    res.render(path.join(__dirname, "view.ejs"), {
        channels: ipcResp.success ? ipcResp.data.filter(c => c.type === 2) : [],
        generators: sortedGenerators
    });
});

router.post("/save", async (req, res) => {
    const guildId = res.locals.guild.id;
    const { generators } = req.body; // Recibimos el array ordenado

    const settings = await db.getSettings(guildId);
    
    // Mapeamos los datos asegurando el orden por el índice del array
    settings.generators = (generators || []).map((g, index) => ({
        sourceId: g.sourceId,
        namePrefix: g.namePrefix,
        userLimit: parseInt(g.userLimit) || 0,
        order: index
    }));

    await settings.save();
    res.json({ success: true });
});

module.exports = router;