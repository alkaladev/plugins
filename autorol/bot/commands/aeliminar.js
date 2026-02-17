const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "aeliminar",
    description: "Elimina un sistema de autorol",
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
        ],
    },

    async interactionRun({ interaction }) {
        try {
            const messageId = interaction.options.getString("mensaje");

            // Obtener el mensaje de la BD
            const messageData = await db.getMessageByMessageId(interaction.guild.id, messageId);
            if (!messageData) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ No encontré ese mensaje. Verifica el ID.");
                return interaction.followUp({ embeds: [embed] });
            }

            // Verificar que el mensaje existe en Discord y eliminarlo
            try {
                const channel = interaction.guild.channels.cache.get(messageData.channelId);
                if (channel) {
                    try {
                        const discordMessage = await channel.messages.fetch(messageId);
                        await discordMessage.delete();
                    } catch (fetchError) {
                        // El mensaje ya no existe, continuar con la eliminación de la BD
                    }
                }
            } catch (error) {
                console.error("[Autorol] Error eliminando mensaje de Discord:", error);
            }

            // Eliminar de la BD
            await db.deleteMessage(interaction.guild.id, messageId);

            const successEmbed = new EmbedBuilder()
                .setColor("#01fd3b")
                .setTitle("✅ Sistema eliminado")
                .setDescription("El sistema de autorol ha sido eliminado correctamente.");

            return interaction.followUp({ embeds: [successEmbed] });
        } catch (error) {
            console.error("[Autorol] Error en interactionRun:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error eliminando el sistema de autorol");
            return interaction.followUp({ embeds: [embed] });
        }
    },
};
