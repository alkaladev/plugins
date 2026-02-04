const path = require("path");
const router = require("express").Router();
const db = require("../db.service");

router.get("/", async (req, res) => {
    const guildId = res.locals.guild.id;
    
    // Obtenemos canales para saber dónde enviar el embed, y los settings actuales
    const [channelsResp, settings] = await Promise.all([
        req.broadcastOne("dashboard:sendembed", { guildId }),
        db.getSettings(res.locals.guild),
    ]);

    const channels = channelsResp.success ? channelsResp.data : [];

    res.render(path.join(__dirname, "view.ejs"), {
        channels,
        settings,
        settingsTab: false,
        // En este caso, el tab principal es el constructor de Embed
        tabs: ["Embed Builder"], 
    });
});

router.put("/", async (req, res) => {
    const settings = await db.getSettings(res.locals.guild);
    const body = req.body;

    // Lógica para actualizar el Embed personalizado
    if (body.action === "embed_update") {
        
        // Texto y Descripción (limpiando espacios y saltos de línea)
        if (body.embed_title !== undefined) settings.embed.title = body.embed_title.trim();
        
        if (body.embed_description !== undefined) {
            settings.embed.description = body.embed_description.trim().replace(/\r?\n/g, "\\n");
        }

        // Color Hexadecimal
        if (body.embed_color !== undefined) settings.embed.color = body.embed_color;

        // Imágenes (Grande y Thumbnail)
        if (body.embed_image !== undefined) settings.embed.image = body.embed_image.trim();
        if (body.embed_thumbnail !== undefined) settings.embed.thumbnail = body.embed_thumbnail.trim();

        // Footer y Autor
        if (body.embed_footer !== undefined) settings.embed.footer.text = body.embed_footer.trim();
        if (body.embed_author !== undefined) settings.embed.author.name = body.embed_author.trim();

        // Iconos de Footer y Autor
        if (body.embed_footer_icon !== undefined) settings.embed.footer.iconURL = body.embed_footer_icon.trim();
        if (body.embed_author_icon !== undefined) settings.embed.author.iconURL = body.embed_author_icon.trim();

        // Timestamp (Booleano)
        if (body.embed_timestamp !== undefined) {
            settings.embed.timestamp = (body.embed_timestamp === "true" || body.embed_timestamp === true);
        }

        // Gestión de campos (Fields) - Se asume que vienen como un Array
        if (body.embed_fields != null) {
            settings.embed.fields = body.embed_fields;
        }
    }

    // Acción para resetear el embed si el usuario quiere empezar de cero
    if (body.action === "embed_reset") {
        settings.embed = {
            title: null,
            description: null,
            color: "#2f3136",
            fields: [],
            footer: { text: null, iconURL: null },
            author: { name: null, iconURL: null },
            image: null,
            thumbnail: null,
            timestamp: false
        };
    }

    await settings.save();
    return res.sendStatus(200);
});

module.exports = router;