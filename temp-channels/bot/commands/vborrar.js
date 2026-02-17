const { EmbedBuilder } = require("discord.js");
const db = require("../../db.service");
const { Logger } = require("strange-sdk/utils");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "vborrar",
    description: "elimina un generador de canales temporales",
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
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error eliminando los canales");
            return message.reply({ embeds: [embed] });
        }
    },

    async interactionRun({ interaction }) {
        try {
            const response = await deleteAllChannels(interaction.guild.id, interaction.guild);
            return interaction.followUp(response);
        } catch (error) {
            console.error("[TempChannels] Error en interactionRun:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error eliminando los canales");
            return interaction.followUp({ embeds: [embed] });
        }
    },
};

async function deleteAllChannels(guildId, guild) {
    try {
        const activeChannels = await db.getActiveChannels(guildId);

        if (activeChannels.length === 0) {
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("📭 No hay canales temporales para eliminar");
            return { embeds: [embed] };
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

        const embed = new EmbedBuilder()
            .setColor("#fd3b02")
            .setTitle("✅ Limpieza Completada");

        if (failedCount > 0) {
            embed.setDescription(`✓ Eliminados: ${deletedCount}\n✗ Fallidos: ${failedCount}`);
        } else {
            embed.setDescription(`✓ Eliminados: ${deletedCount}`);
        }

        return { embeds: [embed] };
    } catch (error) {
        console.error("[TempChannels] Error en deleteAllChannels:", error);
        throw error;
    }
}
