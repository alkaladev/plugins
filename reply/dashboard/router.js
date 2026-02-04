const path = require("path");
const router = require("express").Router();

router.get("/", async (req, res) => {
    res.render(path.join(__dirname, "view.ejs"));
});

router.post("/send", async (req, res) => {
    const { message_id, reply_content } = req.body;
    const guildId = res.locals.guild.id;

    const response = await req.broadcastOne("reply:SEND_FROM_DASHBOARD", {
        guildId,
        messageId: message_id,
        content: reply_content
    });

    if (response.success) {
        res.status(200).send("Respuesta enviada");
    } else {
        res.status(500).send(response.error || "Error al enviar");
    }
});

module.exports = router;