const db = require("../../db.service");
const { Logger } = require("strange-sdk/utils");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "vborrar",
    description: "Elimina todos los canales temporales activos",
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
            const response = await deleteAllChannels(message.guild.id, message.guild);
            return message.reply(response);
        } catch (error) {
            console.error("[TempChannels] Error en messageRun:", error);
            return message.reply("❌ Ocurrió un error eliminando los canales");
        }
    },

    async interactionRun({ interaction }) {
        try {
            const response = await deleteAllChannels(interaction.guild.id, interaction.guild);
            return interaction.followUp(response);
        } catch (error) {
            console.error("[TempChannels] Error en interactionRun:", error);
            return interaction.followUp("❌ Ocurrió un error eliminando los canales");
        }
    },
};

async function deleteAllChannels(guildId, guild) {
    try {
        const activeChannels = await db.getActiveChannels(guildId);

        if (activeChannels.length === 0) {
            return {
                content: "📭 No hay canales temporales para eliminar",
                ephemeral: true,
            };
        }

        let deletedCount = 0;
        let failedCount = 0;

        for (const activeChannel of activeChannels) {
            try {
                const channel = guild.channels.cache.get(activeChannel.channelId);
                if (channel) {
                    await channel.delete();
                    await db.removeActiveChannel(activeChannel.channelId);
                    deletedCount++;
                    Logger.success(`[TempChannels] Canal eliminado manualmente: ${channel.name}`);
                } else {
                    await db.removeActiveChannel(activeChannel.channelId);
                    deletedCount++;
                }
            } catch (error) {
                console.error("[TempChannels] Error eliminando canal:", error);
                failedCount++;
            }
        }

        let response = `✅ **Limpieza Completada**\n\n`;
        response += `✓ Eliminados: ${deletedCount}\n`;
        
        if (failedCount > 0) {
            response += `✗ Fallidos: ${failedCount}`;
        }

        return {
            content: response,
            ephemeral: true,
        };
    } catch (error) {
        console.error("[TempChannels] Error en deleteAllChannels:", error);
        throw error;
    }
}
