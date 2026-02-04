const path = require("path");
const router = require("express").Router();

router.get("/", async (req, res) => {
    res.render(path.join(__dirname, "view.ejs"));
});

router.post("/send", async (req, res) => {
    const { message_id, reply_content } = req.body;
    const guildId = res.locals.guild.id;

    try {
        const response = await req.broadcastOne("reply:replymessage", {
            guildId,
            message_id,
            reply_content
        });

        if (response && response.success) {
            res.sendStatus(200);
        } else {
            res.status(500).send(response?.error || "Error al enviar");
        }
    } catch (err) {
        res.status(500).send("Error de comunicación interna");
    }
});

module.exports = router;