const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "vquitar",
    description: "VQUITAR.DESCRIPTION",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        minArgsCount: 1,
        subcommands: [
            {
                trigger: "<channelId>",
                description: "Elimina el generador de ese canal",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "canal",
                description: "ID del canal del cual eliminar el generador",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun({ message, args }) {
        try {
            const channelId = args[0];

            if (!channelId || !/^\d+$/.test(channelId)) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Debes proporcionar una ID de canal válida");
                return message.reply({ embeds: [embed] });
            }

            const response = await removeGenerator(message.guild.id, channelId, message.guild);
            return message.reply(response);
        } catch (error) {
            console.error("[TempChannels] Error en messageRun:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error eliminando el generador");
            return message.reply({ embeds: [embed] });
        }
    },

    async interactionRun({ interaction }) {
        try {
            const channelId = interaction.options.getString("canal");

            if (!channelId || !/^\d+$/.test(channelId)) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Debes proporcionar una ID de canal válida");
                return interaction.followUp({ embeds: [embed] });
            }

            const response = await removeGenerator(interaction.guild.id, channelId, interaction.guild);
            return interaction.followUp(response);
        } catch (error) {
            console.error("[TempChannels] Error en interactionRun:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error eliminando el generador");
            return interaction.followUp({ embeds: [embed] });
        }
    },
};

async function removeGenerator(guildId, channelId, guild) {
    try {
        const settings = await db.getSettings(guildId);

        const generatorIndex = settings.generators.findIndex((g) => g.sourceChannelId === channelId);
        
        if (generatorIndex === -1) {
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ No hay un generador configurado en ese canal");
            return { embeds: [embed] };
        }

        const generator = settings.generators[generatorIndex];
        const channel = guild.channels.cache.get(channelId);
        const channelName = channel ? channel.name : `Canal \`${channelId}\``;

        settings.generators.splice(generatorIndex, 1);
        await settings.save();

        const embed = new EmbedBuilder()
            .setColor("#fd3b02")
            .setTitle("✅ Generador eliminado correctamente")
            .setDescription(`**Canal:** ${channelName}\n**Nombres:** ${generator.namesList.join(", ")}\n\nLos nuevos usuarios que se conecten al canal no crearán canales temporales`);

        return { embeds: [embed] };
    } catch (error) {
        console.error("[TempChannels] Error en removeGenerator:", error);
        throw error;
    }
}
