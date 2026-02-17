const { EmbedBuilder } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "alista",
    description: "Lista todos los sistemas de autorol en el servidor",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: false,
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
    },

    async interactionRun({ interaction }) {
        try {
            const settings = await db.getSettings(interaction.guild.id);

            if (!settings.messages || settings.messages.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ No hay sistemas de autorol configurados en este servidor.");
                return interaction.followUp({ embeds: [embed] });
            }

            const listEmbed = new EmbedBuilder()
                .setColor("#2f3136")
                .setTitle("📋 Sistemas de Autorol")
                .setDescription(
                    settings.messages
                        .map((msg, index) => {
                            const channel = interaction.guild.channels.cache.get(msg.channelId);
                            const channelName = channel ? `<#${msg.channelId}>` : "`Canal eliminado`";
                            return (
                                `**${index + 1}. ${msg.title}**\n` +
                                `• Canal: ${channelName}\n` +
                                `• Mensaje: \`${msg.messageId}\`\n` +
                                `• Botones: ${msg.buttons.length}/25\n`
                            );
                        })
                        .join("\n")
                );

            return interaction.followUp({ embeds: [listEmbed] });
        } catch (error) {
            console.error("[Autorol] Error en interactionRun:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error listando los sistemas de autorol");
            return interaction.followUp({ embeds: [embed] });
        }
    },
};
