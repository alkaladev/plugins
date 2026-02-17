const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "asetup",
    description: "Crea un nuevo sistema de asignación automática de roles",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        minArgsCount: 2,
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
        ],
    },

    async messageRun({ message, args }) {
        try {
            const titulo = args[0];
            const descripcion = args.slice(1).join(" ");

            if (!titulo || !descripcion) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Debes proporcionar un título y una descripción");
                return message.reply({ embeds: [embed] });
            }

            const color = "#2f3136";
            const roleEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(titulo)
                .setDescription(descripcion);

            const createdMessage = await message.channel.send({ embeds: [roleEmbed] });

            await db.addMessage(message.guildId, {
                messageId: createdMessage.id,
                channelId: message.channelId,
                title: titulo,
                description: descripcion,
                color: color,
                footer: null,
                buttons: [],
            });

            const successEmbed = new EmbedBuilder()
                .setColor("#01fd3b")
                .setTitle("✅ Sistema de roles creado")
                .setDescription(`**ID del mensaje:** \`${createdMessage.id}\``);

            return message.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error("[Autorol] Error en messageRun:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error creando el sistema de roles");
            return message.reply({ embeds: [embed] });
        }
    },

    async interactionRun({ interaction }) {
        try {
            const titulo = interaction.options.getString("titulo");
            const descripcion = interaction.options.getString("descripcion");
            const color = interaction.options.getString("color") || "#2f3136";

            if (!isValidHexColor(color)) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Color hexadecimal inválido");
                return interaction.followUp({ embeds: [embed] });
            }

            const roleEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(titulo)
                .setDescription(descripcion);

            const createdMessage = await interaction.channel.send({ embeds: [roleEmbed] });

            await db.addMessage(interaction.guildId, {
                messageId: createdMessage.id,
                channelId: interaction.channel.id,
                title: titulo,
                description: descripcion,
                color: color,
                footer: null,
                buttons: [],
            });

            const successEmbed = new EmbedBuilder()
                .setColor("#01fd3b")
                .setTitle("✅ Sistema de roles creado")
                .setDescription(`**ID del mensaje:** \`${createdMessage.id}\``);

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
