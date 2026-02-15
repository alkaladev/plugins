const { ApplicationCommandOptionType } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "vquitar",
    description: "Elimina un generador de canales",
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

            // Validar que sea un ID válido
            if (!channelId || !/^\d+$/.test(channelId)) {
                return message.reply("❌ Debes proporcionar una ID de canal válida\n`/vquitar <channelId>`");
            }

            const response = await removeGenerator(message.guild.id, channelId, message.guild);
            return message.reply(response);
        } catch (error) {
            console.error("[TempChannels] Error en messageRun:", error);
            return message.reply("❌ Ocurrió un error eliminando el generador");
        }
    },

    async interactionRun({ interaction }) {
        try {
            const channelId = interaction.options.getString("canal");

            // Validar que sea un ID válido
            if (!channelId || !/^\d+$/.test(channelId)) {
                return interaction.followUp("❌ Debes proporcionar una ID de canal válida");
            }

            const response = await removeGenerator(interaction.guild.id, channelId, interaction.guild);
            return interaction.followUp(response);
        } catch (error) {
            console.error("[TempChannels] Error en interactionRun:", error);
            return interaction.followUp("❌ Ocurrió un error eliminando el generador");
        }
    },
};

async function removeGenerator(guildId, channelId, guild) {
    try {
        const settings = await db.getSettings(guildId);

        // Buscar el generador
        const generatorIndex = settings.generators.findIndex((g) => g.sourceChannelId === channelId);
        
        if (generatorIndex === -1) {
            return "❌ No hay un generador configurado en ese canal";
        }

        const generator = settings.generators[generatorIndex];
        const channel = guild.channels.cache.get(channelId);
        const channelName = channel ? channel.name : `Canal \`${channelId}\``;

        // Eliminar el generador
        settings.generators.splice(generatorIndex, 1);
        await settings.save();

        return `✅ Generador eliminado correctamente\n
📌 **Detalles:**
• Canal: ${channelName}
• Prefijo: ${generator.namePrefix}
• Los nuevos usuarios que se conecten al canal no crearán canales temporales`;
    } catch (error) {
        console.error("[TempChannels] Error en removeGenerator:", error);
        throw error;
    }
}
