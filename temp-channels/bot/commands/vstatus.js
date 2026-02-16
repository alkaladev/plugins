const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "vstatus",
    description: "Muestra el estado actual de los canales temporales",
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
            return message.reply("❌ Ocurrió un error obteniendo el estado");
        }
    },

    async interactionRun({ interaction }) {
        try {
            const response = await getStatus(interaction.guild.id, interaction.guild);
            return interaction.followUp(response);
        } catch (error) {
            console.error("[TempChannels] Error en interactionRun:", error);
            return interaction.followUp("❌ Ocurrió un error obteniendo el estado");
        }
    },
};

async function getStatus(guildId, guild) {
    try {
        const activeChannels = await db.getActiveChannels(guildId);

        if (activeChannels.length === 0) {
            return {
                content: "📭 No hay canales temporales activos en este momento",
                ephemeral: true,
            };
        }

        let response = "📊 **Estado de Canales Temporales:**\n\n";

        for (const activeChannel of activeChannels) {
            const channel = guild.channels.cache.get(activeChannel.channelId);
            if (channel) {
                const creator = await guild.members.fetch(activeChannel.createdBy).catch(() => null);
                const creatorName = creator ? creator.user.username : "Usuario desconocido";
                const memberCount = channel.members.size;

                response += `🎤 **${activeChannel.channelName}**\n`;
                response += `└─ Miembros: ${memberCount}/${channel.userLimit || "∞"}\n`;
                response += `└─ Creado por: ${creatorName}\n`;
                response += `└─ Creado hace: ${Math.floor((Date.now() - activeChannel.createdAt) / 1000)}s\n\n`;
            }
        }

        response += `**Total:** ${activeChannels.length} canal${activeChannels.length !== 1 ? "es" : ""} activo${activeChannels.length !== 1 ? "s" : ""}`;

        return {
            content: response,
            ephemeral: true,
        };
    } catch (error) {
        console.error("[TempChannels] Error en getStatus:", error);
        throw error;
    }
}
