const { EmbedBuilder } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "vstatus",
    description: "vuestra el estado de los canales temporales activos",
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
            const response = await getStatus(message.guild.id, message.guild);
            return message.reply(response);
        } catch (error) {
            console.error("[TempChannels] Error en messageRun:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error obteniendo el estado");
            return message.reply({ embeds: [embed] });
        }
    },

    async interactionRun({ interaction }) {
        try {
            const response = await getStatus(interaction.guild.id, interaction.guild);
            return interaction.followUp(response);
        } catch (error) {
            console.error("[TempChannels] Error en interactionRun:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error obteniendo el estado");
            return interaction.followUp({ embeds: [embed] });
        }
    },
};

async function getStatus(guildId, guild) {
    try {
        const activeChannels = await db.getActiveChannels(guildId);

        if (activeChannels.length === 0) {
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("📭 No hay canales temporales activos en este momento");
            return { embeds: [embed] };
        }

        const embed = new EmbedBuilder()
            .setColor("#fd3b02")
            .setTitle("📊 Estado de Canales Temporales");

        for (const activeChannel of activeChannels) {
            const channel = guild.channels.cache.get(activeChannel.channelId);
            if (channel) {
                const creator = await guild.members.fetch(activeChannel.createdBy).catch(() => null);
                const creatorName = creator ? creator.user.username : "Usuario desconocido";
                const memberCount = channel.members.size;
                const secondsAgo = Math.floor((Date.now() - activeChannel.createdAt) / 1000);

                embed.addFields({
                    name: `🎤 ${activeChannel.channelName}`,
                    value: `👥 **Miembros:** ${memberCount}/${channel.userLimit || "∞"}\n👤 **Creado por:** ${creatorName}\n⏱️ **Hace:** ${secondsAgo}s`,
                    inline: false
                });
            }
        }

        embed.setFooter({ text: `Total: ${activeChannels.length} canal${activeChannels.length !== 1 ? "es" : ""} activo${activeChannels.length !== 1 ? "s" : ""}` });

        return { embeds: [embed] };
    } catch (error) {
        console.error("[TempChannels] Error en getStatus:", error);
        throw error;
    }
}
