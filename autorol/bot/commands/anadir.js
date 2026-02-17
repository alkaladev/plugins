const { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "anadir",
    description: "Añade un botón de rol al sistema de autorol",
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
                name: "rol",
                description: "El rol a asignar",
                type: ApplicationCommandOptionType.Role,
                required: true,
            },
            {
                name: "etiqueta",
                description: "Texto del botón (máx 80 caracteres)",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: "emoji",
                description: "Emoji para el botón (opcional)",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
            {
                name: "estilo",
                description: "Estilo del botón",
                type: ApplicationCommandOptionType.String,
                required: false,
                choices: [
                    { name: "Azul (Primary)", value: "Primary" },
                    { name: "Gris (Secondary)", value: "Secondary" },
                    { name: "Verde (Success)", value: "Success" },
                    { name: "Rojo (Danger)", value: "Danger" },
                ],
            },
        ],
    },

    async interactionRun({ interaction }) {
        try {
            const messageId = interaction.options.getString("mensaje");
            const role = interaction.options.getRole("rol");
            const label = interaction.options.getString("etiqueta");
            const emoji = interaction.options.getString("emoji") || null;
            const style = interaction.options.getString("estilo") || "Primary";

            // Validar label
            if (label.length > 80) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ La etiqueta no puede exceder 80 caracteres");
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

            // Verificar que no haya más de 25 botones (límite de Discord)
            if (messageData.buttons.length >= 25) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Este embed ya tiene el máximo de botones (25).");
                return interaction.followUp({ embeds: [embed] });
            }

            // Verificar que el rol no esté ya en el embed
            if (messageData.buttons.some((b) => b.roleId === role.id)) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Este rol ya tiene un botón en este embed.");
                return interaction.followUp({ embeds: [embed] });
            }

            // Añadir botón a la BD
            await db.addButton(interaction.guild.id, messageId, {
                roleId: role.id,
                label: label,
                emoji: emoji,
                style: style,
            });

            // Obtener la información actualizada
            const updatedMessage = await db.getMessageByMessageId(interaction.guild.id, messageId);

            // Reconstruir el embed y los botones
            const embeds = discordMessage.embeds;
            const rows = buildButtonRows(updatedMessage.buttons);

            // Actualizar el mensaje
            try {
                await discordMessage.edit({
                    embeds: embeds,
                    components: rows,
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
                .setTitle("✅ Botón añadido")
                .setDescription(
                    `Se ha añadido el rol ${role} con la etiqueta **${label}**\n\n` +
                    `**Botones totales:** ${updatedMessage.buttons.length}/25`
                );

            return interaction.followUp({ embeds: [successEmbed] });
        } catch (error) {
            console.error("[Autorol] Error en interactionRun:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error añadiendo el botón");
            return interaction.followUp({ embeds: [embed] });
        }
    },
};

function buildButtonRows(buttons) {
    const rows = [];
    let currentRow = new ActionRowBuilder();

    buttons.forEach((button) => {
        if (currentRow.components.length >= 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }

        const buttonBuilder = new ButtonBuilder()
            .setCustomId(`autorol_${button.roleId}`)
            .setLabel(button.label)
            .setStyle(getButtonStyle(button.style));

        if (button.emoji) {
            buttonBuilder.setEmoji(button.emoji);
        }

        currentRow.addComponents(buttonBuilder);
    });

    if (currentRow.components.length > 0) {
        rows.push(currentRow);
    }

    return rows;
}

function getButtonStyle(style) {
    const styles = {
        Primary: ButtonStyle.Primary,
        Secondary: ButtonStyle.Secondary,
        Success: ButtonStyle.Success,
        Danger: ButtonStyle.Danger,
    };
    return styles[style] || ButtonStyle.Primary;
}
