const { ApplicationCommandOptionType, ChannelType } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "veditar",
    description: "Edita un generador de canales existente",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "canal",
                description: "ID del canal del generador a editar",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: "nombres",
                description: "Nuevos nombres separados por comas (opcional)",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
            {
                name: "limite",
                description: "Nuevo límite de usuarios (opcional)",
                type: ApplicationCommandOptionType.Integer,
                required: false,
                minValue: 0,
                maxValue: 99,
            },
        ],
    },

    async messageRun({ message, args }) {
        try {
            const channelId = args[0];

            if (!channelId || !/^\d+$/.test(channelId)) {
                return message.reply("❌ ID de canal inválida");
            }

            const channel = message.guild.channels.cache.get(channelId);
            if (!channel) {
                return message.reply("❌ Canal no encontrado");
            }

            const response = await editGenerator(message.guild.id, channelId, message.guild);
            return message.reply(response);
        } catch (error) {
            console.error("[TempChannels] Error:", error);
            return message.reply("❌ Ocurrió un error editando el generador");
        }
    },

    async interactionRun({ interaction }) {
        try {
            const channelId = interaction.options.getString("canal");
            const namesString = interaction.options.getString("nombres");
            const newLimit = interaction.options.getInteger("limite");

            if (!channelId || !/^\d+$/.test(channelId)) {
                return interaction.followUp("❌ ID de canal inválida");
            }

            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) {
                return interaction.followUp("❌ Canal no encontrado");
            }

            const response = await editGenerator(
                interaction.guild.id,
                channelId,
                interaction.guild,
                namesString,
                newLimit
            );
            return interaction.followUp(response);
        } catch (error) {
            console.error("[TempChannels] Error:", error);
            return interaction.followUp("❌ Ocurrió un error editando el generador");
        }
    },
};

async function editGenerator(guildId, channelId, guild, namesString, newLimit) {
    try {
        const settings = await db.getSettings(guildId);
        const generatorIndex = settings.generators.findIndex((g) => g.sourceChannelId === channelId);

        if (generatorIndex === -1) {
            return "❌ No hay un generador configurado en ese canal";
        }

        const generator = settings.generators[generatorIndex];
        let updated = false;
        let changes = [];

        if (namesString) {
            const names = namesString.split(",").map(n => n.trim()).filter(n => n.length > 0);
            if (names.length > 0) {
                generator.namesList = names;
                generator.currentNameIndex = 0;
                updated = true;
                changes.push(`Nuevos nombres: ${names.join(", ")}`);
            }
        }

        if (newLimit !== null && newLimit !== undefined) {
            generator.userLimit = newLimit;
            updated = true;
            changes.push(`Nuevo límite: ${newLimit === 0 ? "Ilimitado" : newLimit} usuarios`);
        }

        if (!updated) {
            return "⚠️ No se especificaron cambios";
        }

        await settings.save();

        let response = `✅ Generador editado correctamente\n\n`;
        response += `📌 **Cambios realizados:**\n`;
        changes.forEach(change => {
            response += `• ${change}\n`;
        });

        return response;
    } catch (error) {
        console.error("[TempChannels] Error en editGenerator:", error);
        throw error;
    }
}
