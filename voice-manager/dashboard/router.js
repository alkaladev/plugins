const path = require("path");
const router = require("express").Router();

router.get("/", async (req, res) => {
    res.render(path.join(__dirname, "view.ejs"));
});

router.post("/setup", async (req, res) => {
    const { channel_id, prefix, limit } = req.body;
    const guildId = res.locals.guild.id;

    try {
        const response = await req.broadcastOne("ipc:voice:setup", {
            guildId,
            channel_id,
            prefix,
            limit: parseInt(limit)
        });

        if (response && response.success) {
            res.status(200).send("Configuración actualizada");
        } else {
            res.status(500).send(response?.error || "Error al configurar");
        }
    } catch (err) {
        res.status(500).send("Error de comunicación con el bot");
    }
});

module.exports = router;