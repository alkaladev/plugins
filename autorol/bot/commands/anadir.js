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
        enabled: true,
        minArgsCount: 3,
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
                description: "Texto del botón",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun({ message, args }) {
        try {
            const messageId = args[0];
            const roleId = args[1];
            const label = args.slice(2).join(" ");

            if (!messageId || !roleId || !label) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Argumentos insuficientes");
                return message.reply({ embeds: [embed] });
            }

            if (label.length > 80) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ La etiqueta no puede exceder 80 caracteres");
                return message.reply({ embeds: [embed] });
            }

            let role;
            try {
                role = await message.guild.roles.fetch(roleId);
            } catch (error) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Rol no encontrado");
                return message.reply({ embeds: [embed] });
            }

            const messageData = await db.getMessageByMessageId(message.guildId, messageId);
            if (!messageData) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Mensaje no encontrado");
                return message.reply({ embeds: [embed] });
            }

            if (messageData.buttons.length >= 25) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Máximo de botones alcanzado (25)");
                return message.reply({ embeds: [embed] });
            }

            if (messageData.buttons.some((b) => b.roleId === roleId)) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Este rol ya tiene un botón");
                return message.reply({ embeds: [embed] });
            }

            let discordMessage;
            try {
                const channel = message.guild.channels.cache.get(messageData.channelId);
                discordMessage = await channel.messages.fetch(messageId);
            } catch (error) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Mensaje de Discord no encontrado");
                return message.reply({ embeds: [embed] });
            }

            await db.addButton(message.guildId, messageId, {
                roleId: roleId,
                label: label,
                emoji: null,
                style: "Primary",
            });

            const updatedMessage = await db.getMessageByMessageId(message.guildId, messageId);
            const embeds = discordMessage.embeds;
            const rows = buildButtonRows(updatedMessage.buttons);

            await discordMessage.edit({ embeds: embeds, components: rows });

            const successEmbed = new EmbedBuilder()
                .setColor("#01fd3b")
                .setTitle("✅ Botón añadido")
                .setDescription(`Botones: ${updatedMessage.buttons.length}/25`);

            return message.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error("[Autorol] Error:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Error al añadir botón");
            return message.reply({ embeds: [embed] });
        }
    },

    async interactionRun({ interaction }) {
        try {
            const messageId = interaction.options.getString("mensaje");
            const role = interaction.options.getRole("rol");
            const label = interaction.options.getString("etiqueta");

            if (label.length > 80) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ La etiqueta no puede exceder 80 caracteres");
                return interaction.followUp({ embeds: [embed] });
            }

            const messageData = await db.getMessageByMessageId(interaction.guildId, messageId);
            if (!messageData) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Mensaje no encontrado");
                return interaction.followUp({ embeds: [embed] });
            }

            if (messageData.buttons.length >= 25) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Máximo de botones alcanzado (25)");
                return interaction.followUp({ embeds: [embed] });
            }

            if (messageData.buttons.some((b) => b.roleId === role.id)) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Este rol ya tiene un botón");
                return interaction.followUp({ embeds: [embed] });
            }

            let discordMessage;
            try {
                const channel = interaction.guild.channels.cache.get(messageData.channelId);
                discordMessage = await channel.messages.fetch(messageId);
            } catch (error) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Mensaje de Discord no encontrado");
                return interaction.followUp({ embeds: [embed] });
            }

            await db.addButton(interaction.guildId, messageId, {
                roleId: role.id,
                label: label,
                emoji: null,
                style: "Primary",
            });

            const updatedMessage = await db.getMessageByMessageId(interaction.guildId, messageId);
            const embeds = discordMessage.embeds;
            const rows = buildButtonRows(updatedMessage.buttons);

            await discordMessage.edit({ embeds: embeds, components: rows });

            const successEmbed = new EmbedBuilder()
                .setColor("#01fd3b")
                .setTitle("✅ Botón añadido")
                .setDescription(`Botones: ${updatedMessage.buttons.length}/25`);

            return interaction.followUp({ embeds: [successEmbed] });
        } catch (error) {
            console.error("[Autorol] Error:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Error al añadir botón");
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
            .setStyle(ButtonStyle.Primary);

        currentRow.addComponents(buttonBuilder);
    });

    if (currentRow.components.length > 0) {
        rows.push(currentRow);
    }

    return rows;
}
