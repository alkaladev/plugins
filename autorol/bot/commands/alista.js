const { EmbedBuilder } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "alista",
    description: "Lista todos los sistemas de autorol",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        minArgsCount: 0,
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
    },

    async messageRun({ message }) {
        try {
            const settings = await db.getSettings(message.guildId);

            if (!settings.messages || settings.messages.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("📭 No hay sistemas configurados");
                return message.reply({ embeds: [embed] });
            }

            const listEmbed = new EmbedBuilder()
                .setColor("#2f3136")
                .setTitle("📋 Sistemas de Autorol")
                .setDescription(
                    settings.messages
                        .map((msg, index) => {
                            const channel = message.guild.channels.cache.get(msg.channelId);
                            const channelName = channel ? `<#${msg.channelId}>` : "Canal eliminado";
                            return (
                                `**${index + 1}. ${msg.title}**\n` +
                                `• Canal: ${channelName}\n` +
                                `• Mensaje: \`${msg.messageId}\`\n` +
                                `• Botones: ${msg.buttons.length}/25`
                            );
                        })
                        .join("\n\n")
                );

            return message.reply({ embeds: [listEmbed] });
        } catch (error) {
            console.error("[Autorol] Error:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Error listando sistemas");
            return message.reply({ embeds: [embed] });
        }
    },

    async interactionRun({ interaction }) {
        try {
            const settings = await db.getSettings(interaction.guildId);

            if (!settings.messages || settings.messages.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("📭 No hay sistemas configurados");
                return interaction.followUp({ embeds: [embed] });
            }

            const listEmbed = new EmbedBuilder()
                .setColor("#2f3136")
                .setTitle("📋 Sistemas de Autorol")
                .setDescription(
                    settings.messages
                        .map((msg, index) => {
                            const channel = interaction.guild.channels.cache.get(msg.channelId);
                            const channelName = channel ? `<#${msg.channelId}>` : "Canal eliminado";
                            return (
                                `**${index + 1}. ${msg.title}**\n` +
                                `• Canal: ${channelName}\n` +
                                `• Mensaje: \`${msg.messageId}\`\n` +
                                `• Botones: ${msg.buttons.length}/25`
                            );
                        })
                        .join("\n\n")
                );

            return interaction.followUp({ embeds: [listEmbed] });
        } catch (error) {
            console.error("[Autorol] Error:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Error listando sistemas");
            return interaction.followUp({ embeds: [embed] });
        }
    },
};
