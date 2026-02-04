const path = require("path");
const router = require("express").Router();
const db = require("../db.service");

router.get("/", async (req, res) => {
    try {
        const settings = await db.getSettings(res.locals.guild);
        
        // Verificamos que settings.embed exista para que EJS no explote
        if (!settings.embed) {
            settings.embed = { title: "", description: "", fields: [], footer: {}, author: {} };
        }

        res.render(path.join(__dirname, "view.ejs"), {
            channels: [], // Lo dejamos vacío para probar si carga la web
            settings,
            tabs: ["Embed Builder"], 
        });
    } catch (error) {
        console.error("ERROR EN ROUTER:", error);
        res.status(500).send("Error interno: " + error.message);
    }
});

router.put("/", async (req, res) => {
    // Código del PUT (puedes dejar el anterior, no afecta a la carga inicial)
    res.sendStatus(200);
});

module.exports = router;