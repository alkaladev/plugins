const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "aeditar",
    description: "Edita un sistema de autorol",
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
                name: "mensaje",
                description: "ID del mensaje del embed",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: "titulo",
                description: "Nuevo título",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
            {
                name: "descripcion",
                description: "Nueva descripción",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
        ],
    },

    async messageRun({ message, args }) {
        try {
            const messageId = args[0];
            const titulo = args[1];
            const descripcion = args.slice(2).join(" ");

            if (!messageId || !titulo) {
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

            let discordMessage;
            try {
                const channel = message.guild.channels.cache.get(messageData.channelId);
                discordMessage = await channel.messages.fetch(messageId);
            } catch (error) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Mensaje no encontrado");
                return message.reply({ embeds: [embed] });
            }

            await db.updateMessage(message.guildId, messageId, {
                title: titulo,
                description: descripcion || messageData.description,
            });

            const updatedMessage = await db.getMessageByMessageId(message.guildId, messageId);
            const newEmbed = new EmbedBuilder()
                .setColor(updatedMessage.color)
                .setTitle(updatedMessage.title)
                .setDescription(updatedMessage.description);

            await discordMessage.edit({ embeds: [newEmbed] });

            const successEmbed = new EmbedBuilder()
                .setColor("#01fd3b")
                .setTitle("✅ Embed actualizado");

            return message.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error("[Autorol] Error:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Error al editar");
            return message.reply({ embeds: [embed] });
        }
    },

    async interactionRun({ interaction }) {
        try {
            const messageId = interaction.options.getString("mensaje");
            const newTitle = interaction.options.getString("titulo");
            const newDescription = interaction.options.getString("descripcion");

            if (!newTitle && !newDescription) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Debes proporcionar al menos un campo");
                return interaction.followUp({ embeds: [embed] });
            }

            const messageData = await db.getMessageByMessageId(interaction.guildId, messageId);
            if (!messageData) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Mensaje no encontrado");
                return interaction.followUp({ embeds: [embed] });
            }

            let discordMessage;
            try {
                const channel = interaction.guild.channels.cache.get(messageData.channelId);
                discordMessage = await channel.messages.fetch(messageId);
            } catch (error) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Mensaje no encontrado");
                return interaction.followUp({ embeds: [embed] });
            }

            const updates = {};
            if (newTitle) updates.title = newTitle;
            if (newDescription) updates.description = newDescription;

            await db.updateMessage(interaction.guildId, messageId, updates);

            const updatedMessage = await db.getMessageByMessageId(interaction.guildId, messageId);
            const newEmbed = new EmbedBuilder()
                .setColor(updatedMessage.color)
                .setTitle(updatedMessage.title)
                .setDescription(updatedMessage.description);

            await discordMessage.edit({ embeds: [newEmbed] });

            const successEmbed = new EmbedBuilder()
                .setColor("#01fd3b")
                .setTitle("✅ Embed actualizado");

            return interaction.followUp({ embeds: [successEmbed] });
        } catch (error) {
            console.error("[Autorol] Error:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Error al editar");
            return interaction.followUp({ embeds: [embed] });
        }
    },
};
