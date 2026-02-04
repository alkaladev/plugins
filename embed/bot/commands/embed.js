const { ApplicationCommandOptionType, ChannelType, EmbedBuilder } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "embed",
    description: "Envía el embed personalizado configurado en la Dashboard",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        usage: "<#canal>",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "canal",
                description: "Canal donde se enviará el embed",
                type: ApplicationCommandOptionType.Channel,
                channelTypes: [ChannelType.GuildText],
                required: true,
            },
        ],
    },

    async messageRun({ message, args }) {
        const settings = await db.getSettings(message.guild);
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);

        if (!channel || channel.type !== ChannelType.GuildText) {
            return message.reply("Por favor, menciona un canal de texto válido.");
        }

        const response = await sendEmbed(settings, channel);
        return message.reply(response);
    },

    async interactionRun({ interaction }) {
        const settings = await db.getSettings(interaction.guild);
        const channel = interaction.options.getChannel("canal");

        const response = await sendEmbed(settings, channel);
        return interaction.followUp(response);
    },
};

/**
 * Función centralizada para construir y enviar el embed personalizado
 */
async function sendEmbed(settings, channel) {
    const data = settings.embed;
    const guild = channel.guild;

    // Verificar si el bot tiene permisos en ese canal
    if (!guild.members.me.permissionsIn(channel).has(["SendMessages", "EmbedLinks"])) {
        return `No tengo permisos para enviar embeds en ${channel.toString()}`;
    }

    // Validar que el embed tenga al menos algo de contenido
    if (!data.title && !data.description && !data.image) {
        return "⚠️ El embed no está configurado. Ve a la Dashboard para diseñarlo antes de enviarlo.";
    }

    try {
        const embed = new EmbedBuilder();

        // Aplicar datos de la DB
        if (data.title) embed.setTitle(data.title);
        if (data.description) embed.setDescription(data.description.replaceAll("\\n", "\n"));
        if (data.color) embed.setColor(data.color);
        if (data.image) embed.setImage(data.image);
        if (data.thumbnail) embed.setThumbnail(data.thumbnail);
        if (data.timestamp) embed.setTimestamp();

        // Campos (Fields)
        if (data.fields && Array.isArray(data.fields) && data.fields.length > 0) {
            embed.addFields(data.fields.map(f => ({
                name: f.name,
                value: f.value,
                inline: f.inline || false
            })));
        }

        // Autor
        if (data.author && data.author.name) {
            embed.setAuthor({
                name: data.author.name,
                iconURL: data.author.iconURL || null
            });
        }

        // Footer
        if (data.footer && data.footer.text) {
            embed.setFooter({
                text: data.footer.text,
                iconURL: data.footer.iconURL || null
            });
        }

        await channel.send({ embeds: [embed] });
        return `✅ El embed ha sido enviado correctamente a ${channel.toString()}`;

    } catch (error) {
        console.error("Error al enviar custom embed:", error);
        return "❌ Error: Asegúrate de que las URLs de las imágenes sean válidas y que el embed no exceda los límites de Discord.";
    }
}