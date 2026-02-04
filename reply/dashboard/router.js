router.post("/responder", async (req, res) => {
    const { channelId, messageId, content } = req.body;
    const guildId = res.locals.guild.id;

    // El nombre del evento debe coincidir con el del IF (REPLY_TO_MESSAGE)
    const response = await req.broadcastOne("REPLY_TO_MESSAGE", { 
        payload: { channelId, messageId, content } 
    });

    if (response && response.success) {
        // Puedes redirigir con un query para mostrar un mensaje de éxito
        res.redirect(`${req.baseUrl}?success=true`);
    } else {
        res.status(500).send(response?.error || "Error al procesar la respuesta");
    }
});