const path = require("path");
const router = require("express").Router();
const db = require("../db.service");

router.get("/", async (req, res) => {
    const guildId = res.locals.guild.id;

    try {
        // Solicitamos canales al bot con la acción 'get_channels'
        const [channelsResp, settings] = await Promise.all([
            req.broadcastOne("dashboard:sendembed", { guildId, action: "get_channels" }, 5000)
                .catch(() => ({ success: false })),
            db.getSettings(res.locals.guild),
        ]);

        res.render(path.join(__dirname, "view.ejs"), {
            channels: channelsResp.success ? channelsResp.data : [],
            settings,
            tabs: ["Embed Builder"], 
        });
    } catch (error) {
        console.error("[DASHBOARD] Error en GET /:", error);
        res.status(500).send("Error interno");
    }
});

router.put("/", async (req, res) => {
    const settings = await db.getSettings(res.locals.guild);
    const body = req.body;
    const guildId = res.locals.guild.id;

    // ACCIÓN: GUARDAR CONFIGURACIÓN
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

    // ACCIÓN: ENVIAR EMBED AL CANAL SELECCIONADO
    if (body.action === "embed_send") {
        if (!body.target_channel) return res.status(400).send("No channel selected");

        // Construimos el objeto embed para el bot
        const embedPayload = {
            title: body.embed_title || null,
            description: body.embed_description?.replace(/\\n/g, '\n') || null,
            color: body.embed_color || "#2f3136",
            image: { url: body.embed_image || null },
            thumbnail: { url: body.embed_thumbnail || null },
            footer: { text: body.embed_footer || null, icon_url: body.embed_footer_icon || null },
            author: { name: body.embed_author || null, icon_url: body.embed_author_icon || null },
            fields: body.embed_fields || []
        };

        if (body.embed_timestamp) embedPayload.timestamp = new Date().toISOString();

        // Enviamos la orden al IPC
        const response = await req.broadcastOne("dashboard:sendembed", {
            guildId,
            action: "send_embed",
            channelId: body.target_channel,
            embedData: embedPayload
        });

        return response.success ? res.sendStatus(200) : res.status(500).send(response.error);
    }

    // ACCIÓN: RESETEAR
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