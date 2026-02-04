const path = require("path");
const router = require("express").Router();
const db = require("../db.service");

// GET: Cargar la página
router.get("/", async (req, res) => {
    const guildId = res.locals.guild.id;

    try {
        // 1. Obtener configuración de la base de datos (Local)
        const settings = await db.getSettings(res.locals.guild);

        // 2. Intentar obtener canales del bot con un tiempo límite de 2 segundos
        let channels = [];
        try {
            // Si el bot no responde en 2000ms, lanza error y la web carga sin canales
            const channelsResp = await req.broadcastOne("dashboard:sendembed", { 
                guildId, 
                action: "get_channels" 
            }, 2000);

            if (channelsResp && channelsResp.success) {
                channels = channelsResp.data;
            }
        } catch (ipcError) {
            console.warn("[DASHBOARD] El bot no respondió a tiempo. Cargando selector de canales vacío.");
        }

        // 3. Renderizar la vista pasándole los datos
        res.render(path.join(__dirname, "view.ejs"), {
            channels,
            settings,
            tabs: ["Embed Builder"], 
        });

    } catch (error) {
        console.error("[DASHBOARD] Error fatal al renderizar la vista:", error);
        res.status(500).send("Error interno al cargar la Dashboard");
    }
});

// PUT: Guardar o Enviar datos
router.put("/", async (req, res) => {
    const settings = await db.getSettings(res.locals.guild);
    const body = req.body;
    const guildId = res.locals.guild.id;

    // ACCIÓN 1: Actualizar la configuración en la DB
    if (body.action === "embed_update") {
        settings.embed.title = body.embed_title?.trim() || null;
        
        if (body.embed_description) {
            settings.embed.description = body.embed_description.trim().replace(/\r?\n/g, "\\n");
        } else {
            settings.embed.description = null;
        }

        settings.embed.color = body.embed_color || "#2f3136";
        settings.embed.image = body.embed_image?.trim() || null;
        settings.embed.thumbnail = body.embed_thumbnail?.trim() || null;

        settings.embed.footer = {
            text: body.embed_footer?.trim() || null,
            iconURL: body.embed_footer_icon?.trim() || null
        };

        settings.embed.author = {
            name: body.embed_author?.trim() || null,
            iconURL: body.embed_author_icon?.trim() || null
        };
        
        settings.embed.timestamp = body.embed_timestamp === true || body.embed_timestamp === "true";

        if (Array.isArray(body.embed_fields)) {
            settings.embed.fields = body.embed_fields.map(f => ({
                name: f.name,
                value: f.value,
                inline: f.inline === true || f.inline === "true"
            }));
        }

        await settings.save();
        return res.sendStatus(200);
    }

    // ACCIÓN 2: Enviar el Embed a Discord ahora mismo
    if (body.action === "embed_send") {
        if (!body.target_channel) return res.status(400).send("No channel selected");

        // Construimos el objeto que Discord entiende
        const embedPayload = {
            title: body.embed_title || null,
            description: body.embed_description?.replace(/\\n/g, '\n') || null,
            color: parseInt(body.embed_color?.replace('#', ''), 16) || 3092790, // Convertimos hex a decimal
            image: body.embed_image ? { url: body.embed_image } : null,
            thumbnail: body.embed_thumbnail ? { url: body.embed_thumbnail } : null,
            footer: body.embed_footer ? { text: body.embed_footer, icon_url: body.embed_footer_icon || null } : null,
            author: body.embed_author ? { name: body.embed_author, icon_url: body.embed_author_icon || null } : null,
            fields: body.embed_fields || []
        };

        if (body.embed_timestamp === true || body.embed_timestamp === "true") {
            embedPayload.timestamp = new Date().toISOString();
        }

        // Llamamos al archivo IPC del bot
        const response = await req.broadcastOne("dashboard:sendembed", {
            guildId,
            action: "send_embed",
            channelId: body.target_channel,
            embedData: embedPayload
        });

        return response.success ? res.sendStatus(200) : res.status(500).send(response.error);
    }

    // ACCIÓN 3: Resetear valores
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
        await settings.save();
        return res.sendStatus(200);
    }

    return res.sendStatus(400);
});

module.exports = router;