const { EmbedBuilder } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "vlista",
    description: "VLISTA.DESCRIPTION",
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
            const response = await listGenerators(message.guild.id, message.guild);
            return message.reply(response);
        } catch (error) {
            console.error("[TempChannels] Error en messageRun:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error listando los generadores");
            return message.reply({ embeds: [embed] });
        }
    },

    async interactionRun({ interaction }) {
        try {
            const response = await listGenerators(interaction.guild.id, interaction.guild);
            return interaction.followUp(response);
        } catch (error) {
            console.error("[TempChannels] Error en interactionRun:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error listando los generadores");
            return interaction.followUp({ embeds: [embed] });
        }
    },
};

async function listGenerators(guildId, guild) {
    try {
        const settings = await db.getSettings(guildId);

        if (!settings.generators || settings.generators.length === 0) {
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("📭 No hay canales configurados como generadores");
            return { embeds: [embed] };
        }

        const embed = new EmbedBuilder()
            .setColor("#fd3b02")
            .setTitle("🎤 Generadores de Canales Configurados");

        settings.generators.forEach((gen, index) => {
            const channel = guild.channels.cache.get(gen.sourceChannelId);
            const channelName = channel ? channel.name : "Canal no encontrado";
            const limit = gen.userLimit === 0 ? "Ilimitado" : gen.userLimit;
            const namesList = gen.namesList ? gen.namesList.join(", ") : "Sin nombres";
            const nextName = gen.namesList ? gen.namesList[0] : "N/A";

            let value = `📝 **Nombres:** ${namesList}\n`;
            value += `🎯 **Próximo:** ${nextName}\n`;
            value += `👥 **Límite:** ${limit}`;

            if (gen.parentCategoryId) {
                const category = guild.channels.cache.get(gen.parentCategoryId);
                const categoryName = category ? category.name : "No encontrada";
                value += `\n📁 **Categoría:** ${categoryName}`;
            }

            embed.addFields({
                name: `${index + 1}. ${channelName}`,
                value: value,
                inline: false
            });
        });

        embed.setFooter({ text: `Total: ${settings.generators.length} generador${settings.generators.length !== 1 ? "es" : ""}` });

        return { embeds: [embed] };
    } catch (error) {
        console.error("[TempChannels] Error en listGenerators:", error);
        throw error;
    }
}
