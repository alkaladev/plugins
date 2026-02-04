const path = require("path");
const router = require("express").Router();
const db = require("../db.service");

router.get("/", async (req, res) => {
    const guildId = res.locals.guild.id;
    
    const [channelsResp, settings] = await Promise.all([
        req.broadcastOne("dashboard:sendembed", { guildId }),
        db.getSettings(res.locals.guild),
    ]);

    res.render(path.join(__dirname, "view.ejs"), {
        channels: channelsResp.success ? channelsResp.data : [],
        settings,
        tabs: ["Embed Builder"], 
    });
});

router.put("/", async (req, res) => {
    const settings = await db.getSettings(res.locals.guild);
    const body = req.body;

    if (body.action === "embed_update") {
        // Mapeo de los campos del Modal de Discord / Formulario Web
        settings.embed.title = body.embed_title?.trim() || null;
        
        // Procesar descripción con saltos de línea
        if (body.embed_description) {
            settings.embed.description = body.embed_description.trim().replace(/\r?\n/g, "\\n");
        } else {
            settings.embed.description = null;
        }

        settings.embed.color = body.embed_color || "#2f3136";
        settings.embed.image = body.embed_image?.trim() || null;
        settings.embed.thumbnail = body.embed_thumbnail?.trim() || null;

        // Footer y Autor (Campos extra que añadimos para completar el diseño)
        settings.embed.footer.text = body.embed_footer?.trim() || null;
        settings.embed.author.name = body.embed_author?.trim() || null;
        
        // Timestamp
        settings.embed.timestamp = body.embed_timestamp === true || body.embed_timestamp === "true";

        // Campos dinámicos (Fields) - Lo que en tu bot manejas con EMBED_FIELD_ADD
        if (Array.isArray(body.embed_fields)) {
            settings.embed.fields = body.embed_fields.map(f => ({
                name: f.name,
                value: f.value,
                inline: f.inline === true || f.inline === "true"
            }));
        }
    }

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