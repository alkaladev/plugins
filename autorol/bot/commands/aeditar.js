const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "aeditar",
    description: "Edita un sistema de autorol existente",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: false,
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "mensaje",
                description: "ID del mensaje del embed",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: "titulo",
                description: "Nuevo título del embed",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
            {
                name: "descripcion",
                description: "Nueva descripción del embed",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
            {
                name: "color",
                description: "Nuevo color en hexadecimal (ej: #FF0000)",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
            {
                name: "pie",
                description: "Nuevo texto del pie de página",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
        ],
    },

    async interactionRun({ interaction }) {
        try {
            const messageId = interaction.options.getString("mensaje");
            const newTitle = interaction.options.getString("titulo");
            const newDescription = interaction.options.getString("descripcion");
            const newColor = interaction.options.getString("color");
            const newFooter = interaction.options.getString("pie");

            // Validar que al menos un campo sea proporcionado
            if (!newTitle && !newDescription && !newColor && !newFooter) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Debes proporcionar al menos un campo para editar.");
                return interaction.followUp({ embeds: [embed] });
            }

            // Validar color si se proporciona
            if (newColor && !isValidHexColor(newColor)) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ El color debe ser un código hexadecimal válido (ej: #FF0000)");
                return interaction.followUp({ embeds: [embed] });
            }

            // Obtener el mensaje de la BD
            const messageData = await db.getMessageByMessageId(interaction.guild.id, messageId);
            if (!messageData) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ No encontré ese mensaje. Verifica el ID.");
                return interaction.followUp({ embeds: [embed] });
            }

            // Verificar que el mensaje existe en Discord
            let discordMessage;
            try {
                const channel = interaction.guild.channels.cache.get(messageData.channelId);
                if (!channel) {
                    await db.deleteMessage(interaction.guild.id, messageId);
                    const embed = new EmbedBuilder()
                        .setColor("#fd3b02")
                        .setDescription("❌ El canal del mensaje fue eliminado.");
                    return interaction.followUp({ embeds: [embed] });
                }

                discordMessage = await channel.messages.fetch(messageId);
            } catch (error) {
                await db.deleteMessage(interaction.guild.id, messageId);
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ No pude encontrar el mensaje en Discord.");
                return interaction.followUp({ embeds: [embed] });
            }

            // Preparar actualizaciones
            const updates = {};
            if (newTitle) updates.title = newTitle;
            if (newDescription) updates.description = newDescription;
            if (newColor) updates.color = newColor;
            if (newFooter) updates.footer = newFooter;

            // Actualizar en la BD
            await db.updateMessage(interaction.guild.id, messageId, updates);

            // Crear nuevo embed
            const updatedMessage = await db.getMessageByMessageId(interaction.guild.id, messageId);
            const newEmbed = new EmbedBuilder()
                .setColor(updatedMessage.color)
                .setTitle(updatedMessage.title)
                .setDescription(updatedMessage.description);

            if (updatedMessage.footer) {
                newEmbed.setFooter({ text: updatedMessage.footer });
            }

            // Actualizar el mensaje en Discord
            try {
                await discordMessage.edit({
                    embeds: [newEmbed],
                });
            } catch (editError) {
                console.error("[Autorol] Error actualizando mensaje:", editError);
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Error al actualizar el embed en Discord.");
                return interaction.followUp({ embeds: [embed] });
            }

            const successEmbed = new EmbedBuilder()
                .setColor("#01fd3b")
                .setTitle("✅ Embed actualizado")
                .setDescription("Se han guardado los cambios correctamente.");

            return interaction.followUp({ embeds: [successEmbed] });
        } catch (error) {
            console.error("[Autorol] Error en interactionRun:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error editando el embed");
            return interaction.followUp({ embeds: [embed] });
        }
    },
};

function isValidHexColor(color) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}
