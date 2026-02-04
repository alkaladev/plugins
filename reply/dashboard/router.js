const path = require("path");
const router = require("express").Router();

router.get("/", async (req, res) => {
    res.render(path.join(__dirname, "view.ejs"));
});

router.post("/send", async (req, res) => {
    const body = req.body;
    const guildId = res.locals.guild.id;

    console.log(`[DASHBOARD] Intento de envío para la guild: ${guildId}`);
    console.log(`[DASHBOARD] Datos recibidos: ID=${body.message_id}, Contenido=${body.reply_content}`);

    try {
        // Dentro del router.post("/send", ...)
const response = await req.broadcastOne("reply:SEND_FROM_DASHBOARD", {
    guildId,
    message_id: body.message_id,   // <--- Con guion bajo
    reply_content: body.reply_content // <--- Con guion bajo
});

        console.log(`[DASHBOARD] Respuesta del BOT:`, response);

        if (response && response.success) {
            res.status(200).send("OK");
        } else {
            res.status(500).send(response?.error || "Error desconocido");
        }
    } catch (err) {
        console.error(`[DASHBOARD] ERROR CRÍTICO IPC:`, err);
        res.status(500).send("Error de comunicación interna");
    }
});

module.exports = router;