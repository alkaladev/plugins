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
        const response = await req.broadcastOne("reply:SEND_FROM_DASHBOARD", {
            guildId,
            messageId: body.message_id,
            content: body.reply_content
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