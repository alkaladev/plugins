const { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "remover",
    description: "Remueve un botón de rol del sistema de autorol",
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
                description: "El rol a remover",
                type: ApplicationCommandOptionType.Role,
                required: true,
            },
        ],
    },

    async interactionRun({ interaction }) {
        try {
            const messageId = interaction.options.getString("mensaje");
            const role = interaction.options.getRole("rol");

            // Obtener el mensaje de la BD
            const messageData = await db.getMessageByMessageId(interaction.guild.id, messageId);
            if (!messageData) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ No encontré ese mensaje. Verifica el ID.");
                return interaction.followUp({ embeds: [embed] });
            }

            // Verificar que el rol exista en el embed
            if (!messageData.buttons.some((b) => b.roleId === role.id)) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Este rol no tiene un botón en este embed.");
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

            // Remover botón de la BD
            await db.removeButton(interaction.guild.id, messageId, role.id);

            // Obtener la información actualizada
            const updatedMessage = await db.getMessageByMessageId(interaction.guild.id, messageId);

            // Reconstruir el embed y los botones
            const embeds = discordMessage.embeds;
            const rows = buildButtonRows(updatedMessage.buttons);

            // Actualizar el mensaje
            try {
                if (rows.length === 0) {
                    await discordMessage.edit({
                        embeds: embeds,
                        components: [],
                    });
                } else {
                    await discordMessage.edit({
                        embeds: embeds,
                        components: rows,
                    });
                }
            } catch (editError) {
                console.error("[Autorol] Error actualizando mensaje:", editError);
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Error al actualizar el embed en Discord.");
                return interaction.followUp({ embeds: [embed] });
            }

            const successEmbed = new EmbedBuilder()
                .setColor("#01fd3b")
                .setTitle("✅ Botón removido")
                .setDescription(
                    `Se ha removido el rol ${role}\n\n` +
                    `**Botones restantes:** ${updatedMessage.buttons.length}/25`
                );

            return interaction.followUp({ embeds: [successEmbed] });
        } catch (error) {
            console.error("[Autorol] Error en interactionRun:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error removiendo el botón");
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
