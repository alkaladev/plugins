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
        enabled: true,
        minArgsCount: 1,
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

    async messageRun({ message, args }) {
        try {
            const messageId = args[0];

            if (!messageId) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Argumentos insuficientes");
                return message.reply({ embeds: [embed] });
            }

            const messageData = await db.getMessageByMessageId(message.guildId, messageId);
            if (!messageData) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Mensaje no encontrado");
                return message.reply({ embeds: [embed] });
            }

            try {
                const channel = message.guild.channels.cache.get(messageData.channelId);
                if (channel) {
                    try {
                        const discordMessage = await channel.messages.fetch(messageId);
                        await discordMessage.delete();
                    } catch (fetchError) {
                        // El mensaje ya no existe
                    }
                }
            } catch (error) {
                console.error("[Autorol] Error:", error);
            }

            await db.deleteMessage(message.guildId, messageId);

            const successEmbed = new EmbedBuilder()
                .setColor("#01fd3b")
                .setTitle("✅ Sistema eliminado");

            return message.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error("[Autorol] Error:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Error al eliminar");
            return message.reply({ embeds: [embed] });
        }
    },

    async interactionRun({ interaction }) {
        try {
            const messageId = interaction.options.getString("mensaje");

            const messageData = await db.getMessageByMessageId(interaction.guildId, messageId);
            if (!messageData) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Mensaje no encontrado");
                return interaction.followUp({ embeds: [embed] });
            }

            try {
                const channel = interaction.guild.channels.cache.get(messageData.channelId);
                if (channel) {
                    try {
                        const discordMessage = await channel.messages.fetch(messageId);
                        await discordMessage.delete();
                    } catch (fetchError) {
                        // El mensaje ya no existe
                    }
                }
            } catch (error) {
                console.error("[Autorol] Error:", error);
            }

            await db.deleteMessage(interaction.guildId, messageId);

            const successEmbed = new EmbedBuilder()
                .setColor("#01fd3b")
                .setTitle("✅ Sistema eliminado");

            return interaction.followUp({ embeds: [successEmbed] });
        } catch (error) {
            console.error("[Autorol] Error:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Error al eliminar");
            return interaction.followUp({ embeds: [embed] });
        }
    },
};
