const { BotPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const BUTTON_STYLES = {
    Primary: ButtonStyle.Primary,
    Secondary: ButtonStyle.Secondary,
    Success: ButtonStyle.Success,
    Danger: ButtonStyle.Danger,
};

const plugin = new BotPlugin({
    dependencies: [],
    baseDir: __dirname,
    dbService: require("../db.service"),

    onEnable: (client) => {
        Logger.success("[Autorol] Cargando plugin...");

        client.on("interactionCreate", async (interaction) => {
            try {
                if (!interaction.isButton()) return;
                if (!interaction.customId.startsWith("autorol_")) return;

                const parts = interaction.customId.split("_");
                const roleId = parts[1];

                if (!roleId) {
                    Logger.error("[Autorol] Role ID no encontrado en customId");
                    return;
                }

                const role = interaction.guild.roles.cache.get(roleId);
                if (!role) {
                    await interaction.reply({ content: "❌ El rol no existe o fue eliminado.", ephemeral: true });
                    return;
                }

                const member = interaction.member;
                let action = "add";

                if (member.roles.cache.has(roleId)) {
                    action = "remove";
                    await member.roles.remove(roleId);
                } else {
                    await member.roles.add(roleId);
                }

                const emoji = action === "add" ? "✅" : "❌";
                const text = action === "add" ? "añadido" : "removido";

                await interaction.reply({
                    content: `${emoji} Rol **${role.name}** ha sido ${text}.`,
                    ephemeral: true,
                });

                Logger.success(`[Autorol] Rol ${action === "add" ? "asignado" : "removido"}: ${role.name} a ${member.user.tag}`);
            } catch (error) {
                Logger.error("[Autorol] Error en interactionCreate:", error);
                try {
                    await interaction.reply({ content: "❌ Ocurrió un error al procesar tu solicitud.", ephemeral: true });
                } catch (_) {}
            }
        });

        Logger.success("[Autorol] Plugin cargado correctamente");
    },
});

// Definir ipcEvents en el objeto del plugin directamente (antes de exportar)
// IPCClient lo llama como: handler(payload, this.discordClient)
plugin.ipcEvents = new Map();

plugin.ipcEvents.set("sendAutorolMessage", async (payload, discordClient) => {
    console.log("[Autorol DEBUG BOT] Handler ejecutado");
    console.log("[Autorol DEBUG BOT] typeof payload:", typeof payload);
    console.log("[Autorol DEBUG BOT] payload completo:", JSON.stringify(payload, null, 2));
    console.log("[Autorol DEBUG BOT] typeof discordClient:", typeof discordClient);
    console.log("[Autorol DEBUG BOT] discordClient?.user?.tag:", discordClient?.user?.tag);

    const { guildId, messageData } = payload;

    console.log("[Autorol DEBUG BOT] guildId:", guildId);
    console.log("[Autorol DEBUG BOT] messageData:", JSON.stringify(messageData, null, 2));
    console.log("[Autorol DEBUG BOT] messageData?.channelId:", messageData?.channelId);

    if (!messageData) throw new Error("messageData es undefined en el payload IPC");
    if (!messageData.channelId) throw new Error("channelId no existe en messageData");

    // Obtener canal directamente (evita problemas de caché de guilds/channels)
    const channel = await discordClient.channels.fetch(messageData.channelId).catch((e) => {
        console.log("[Autorol DEBUG BOT] Error fetching canal:", e.message);
        return null;
    });
    console.log("[Autorol DEBUG BOT] channel:", channel?.name, channel?.id);
    if (!channel) throw new Error("Canal no encontrado (ID: " + messageData.channelId + ")");

    const embed = new EmbedBuilder();
    if (messageData.title)       embed.setTitle(messageData.title);
    if (messageData.description) embed.setDescription(messageData.description);
    if (messageData.color && /^#[0-9A-F]{6}$/i.test(messageData.color)) {
        embed.setColor(messageData.color);
    } else {
        embed.setColor("#5865F2");
    }
    if (messageData.image)     embed.setImage(messageData.image);
    if (messageData.thumbnail) embed.setThumbnail(messageData.thumbnail);
    if (messageData.timestamp) embed.setTimestamp();
    if (messageData.footer?.text) {
        embed.setFooter({ text: messageData.footer.text, iconURL: messageData.footer.iconURL || undefined });
    }
    if (messageData.author?.name) {
        embed.setAuthor({ name: messageData.author.name, iconURL: messageData.author.iconURL || undefined });
    }
    if (Array.isArray(messageData.fields) && messageData.fields.length > 0) {
        embed.addFields(messageData.fields.map(f => ({ name: f.name, value: f.value, inline: !!f.inline })));
    }

    const components = [];
    const buttons = messageData.buttons || [];
    for (let i = 0; i < buttons.length; i += 5) {
        const row = new ActionRowBuilder();
        buttons.slice(i, i + 5).forEach(btn => {
            const button = new ButtonBuilder()
                .setCustomId(`autorol_${btn.roleId}`)
                .setLabel(btn.label)
                .setStyle(BUTTON_STYLES[btn.style] || ButtonStyle.Primary);
            if (btn.emoji) button.setEmoji(btn.emoji);
            row.addComponents(button);
        });
        components.push(row);
    }

    const sent = await channel.send({
        content: messageData.content || undefined,
        embeds: [embed],
        components,
    });

    Logger.success(`[Autorol] Embed enviado en #${channel.name} (ID: ${sent.id})`);
    return { discordMessageId: sent.id };
});

module.exports = plugin;
