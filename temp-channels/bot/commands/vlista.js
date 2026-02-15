const { ApplicationCommandOptionType } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "vlista",
    description: "Muestra la lista de canales generadores configurados",
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
            return message.reply("❌ Ocurrió un error listando los generadores");
        }
    },

    async interactionRun({ interaction }) {
        try {
            const response = await listGenerators(interaction.guild.id, interaction.guild);
            return interaction.followUp(response);
        } catch (error) {
            console.error("[TempChannels] Error en interactionRun:", error);
            return interaction.followUp("❌ Ocurrió un error listando los generadores");
        }
    },
};

async function listGenerators(guildId, guild) {
    try {
        const settings = await db.getSettings(guildId);

        if (!settings.generators || settings.generators.length === 0) {
            return {
                content: "📭 No hay canales configurados como generadores",
                ephemeral: true,
            };
        }

        let response = "🎤 **Generadores de Canales Configurados:**\n\n";

        settings.generators.forEach((gen, index) => {
            const channel = guild.channels.cache.get(gen.sourceChannelId);
            const channelName = channel ? channel.name : "Canal no encontrado";
            const limit = gen.userLimit === 0 ? "Ilimitado" : gen.userLimit;

            response += `**${index + 1}. ${gen.namePrefix}**\n`;
            response += `└─ Canal: <#${gen.sourceChannelId}> (\`${gen.sourceChannelId}\`)\n`;
            response += `└─ Límite: ${limit} usuarios\n`;
            
            if (gen.parentCategoryId) {
                const category = guild.channels.cache.get(gen.parentCategoryId);
                const categoryName = category ? category.name : "Categoría no encontrada";
                response += `└─ Categoría: ${categoryName}\n`;
            }
            
            response += "\n";
        });

        response += `**Total:** ${settings.generators.length} generador${settings.generators.length !== 1 ? "es" : ""}`;

        return {
            content: response,
            ephemeral: true,
        };
    } catch (error) {
        console.error("[TempChannels] Error en listGenerators:", error);
        throw error;
    }
}
