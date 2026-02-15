const path = require("path");
const router = require("express").Router();
const db = require("../db.service");

router.get("/", async (req, res) => {
    const guildId = res.locals.guild.id;
    const [ipcResp, settings] = await Promise.all([
        req.broadcastOne("dashboard:getChannelsOf", { guildId }),
        db.getSettings(guildId),
    ]);

    // Ordenamos los generadores según el campo 'order' antes de renderizar
    const sortedGenerators = settings.generators.sort((a, b) => a.order - b.order);

    res.render(path.join(__dirname, "view.ejs"), { 
        channels: ipcResp.success ? ipcResp.data.filter(c => c.type === 2) : [], 
        generators: sortedGenerators 
    });
});

// Para guardar/actualizar la lista completa (incluyendo el orden)
router.post("/save", async (req, res) => {
    const { generators } = req.body; // Esperamos un array de generadores
    const settings = await db.getSettings(res.locals.guild.id);
    
    settings.generators = generators.map((g, index) => ({
        sourceId: g.sourceId,
        namePrefix: g.namePrefix || "Patrulla ",
        userLimit: parseInt(g.userLimit) || 0,
        order: index // El orden se define por su posición en el array enviado
    }));

    await settings.save();
    res.json({ success: true });
});

module.exports = router;