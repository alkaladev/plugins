const router = require("express").Router();
const path = require("path"); // Aquí NO debería salir apagado
const db = require("../db.service");

router.get("/", async (req, res) => {
    try {
        const guildId = res.locals.guild.id;
        const ipcResp = await req.broadcastOne("dashboard:getChannelsOf", { guildId });
        const settings = await db.getSettings(guildId);
        const sortedGenerators = settings.generators.sort((a, b) => a.order - b.order);

        // Aquí se USA path, por lo que no debería estar apagado
        res.render(path.join(__dirname, "view.ejs"), {
            channels: ipcResp.success ? ipcResp.data.filter(c => c.type === 2) : [],
            generators: sortedGenerators
        });
    } catch (error) {
        console.error("Error en router voice-manager:", error);
        res.status(500).send("Error interno");
    }
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