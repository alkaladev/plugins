const { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "asetup",
    description: "Crea un nuevo sistema de asignación automática de roles",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: false,
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "titulo",
                description: "Título del embed",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: "descripcion",
                description: "Descripción del embed",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: "color",
                description: "Color del embed en hexadecimal (ej: #FF0000)",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
            {
                name: "pie",
                description: "Texto del pie de página",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
        ],
    },

    async interactionRun({ interaction }) {
        try {
            const titulo = interaction.options.getString("titulo");
            const descripcion = interaction.options.getString("descripcion");
            const color = interaction.options.getString("color") || "#2f3136";
            const pie = interaction.options.getString("pie") || null;

            // Validar color
            if (!isValidHexColor(color)) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ El color debe ser un código hexadecimal válido (ej: #FF0000)");
                return interaction.followUp({ embeds: [embed] });
            }

            // Crear embed base
            const roleEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(titulo)
                .setDescription(descripcion);

            if (pie) {
                roleEmbed.setFooter({ text: pie });
            }

            // Crear mensaje sin botones por ahora
            const message = await interaction.channel.send({ embeds: [roleEmbed] });

            // Guardar en la base de datos
            await db.addMessage(interaction.guild.id, {
                messageId: message.id,
                channelId: interaction.channel.id,
                title: titulo,
                description: descripcion,
                color: color,
                footer: pie,
                buttons: [],
            });

            const successEmbed = new EmbedBuilder()
                .setColor("#01fd3b")
                .setTitle("✅ Sistema de roles creado")
                .setDescription(
                    `Se ha creado el sistema de asignación de roles en ${interaction.channel}\n\n` +
                    `**ID del mensaje:** \`${message.id}\`\n\n` +
                    `Usa \`/anadir\` para añadir botones de roles a este embed.`
                );

            return interaction.followUp({ embeds: [successEmbed] });
        } catch (error) {
            console.error("[Autorol] Error en interactionRun:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error creando el sistema de roles");
            return interaction.followUp({ embeds: [embed] });
        }
    },
};

function isValidHexColor(color) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}
