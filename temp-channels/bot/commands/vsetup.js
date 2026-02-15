const { ApplicationCommandOptionType, ChannelType } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "vsetup",
    description: "Configura un canal generador de canales temporales",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        minArgsCount: 3,
        subcommands: [
            {
                trigger: "<#channel> <nombre> <numero>",
                description: "Configura un nuevo generador de canales",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "canal",
                description: "Canal de voz que actuará como generador",
                type: ApplicationCommandOptionType.Channel,
                channelTypes: [ChannelType.GuildVoice],
                required: true,
            },
            {
                name: "nombre",
                description: "Prefijo para los canales temporales (ej: Patrulla)",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: "limite",
                description: "Número máximo de usuarios (0 = ilimitado)",
                type: ApplicationCommandOptionType.Integer,
                required: true,
                minValue: 0,
                maxValue: 99,
            },
            {
                name: "categoria",
                description: "Categoría donde crear los canales (opcional)",
                type: ApplicationCommandOptionType.Channel,
                channelTypes: [ChannelType.GuildCategory],
                required: false,
            },
        ],
    },

    async messageRun({ message, args }) {
        try {
            const channel = message.mentions.channels.first();
            if (!channel || channel.type !== ChannelType.GuildVoice) {
                return message.reply("❌ Debes mencionar un canal de voz válido");
            }

            const namePrefix = args[1];
            if (!namePrefix || namePrefix.length > 20) {
                return message.reply("❌ El nombre debe tener entre 1 y 20 caracteres");
            }

            const userLimit = parseInt(args[2]);
            if (isNaN(userLimit) || userLimit < 0 || userLimit > 99) {
                return message.reply("❌ El límite debe ser un número entre 0 y 99");
            }

            const response = await addGenerator(
                message.guild.id,
                channel.id,
                namePrefix,
                userLimit,
                null,
            );

            return message.reply(response);
        } catch (error) {
            console.error("[TempChannels] Error en messageRun:", error);
            return message.reply("❌ Ocurrió un error configurando el generador");
        }
    },

    async interactionRun({ interaction }) {
        try {
            const channel = interaction.options.getChannel("canal");
            const namePrefix = interaction.options.getString("nombre");
            const userLimit = interaction.options.getInteger("limite");
            const categoryChannel = interaction.options.getChannel("categoria");

            const response = await addGenerator(
                interaction.guild.id,
                channel.id,
                namePrefix,
                userLimit,
                categoryChannel?.id || null,
            );

            return interaction.followUp(response);
        } catch (error) {
            console.error("[TempChannels] Error en interactionRun:", error);
            return interaction.followUp("❌ Ocurrió un error configurando el generador");
        }
    },
};

async function addGenerator(guildId, channelId, namePrefix, userLimit, parentCategoryId) {
    try {
        const settings = await db.getSettings(guildId);

        // Verificar si el canal ya está configurado
        const exists = settings.generators.some((g) => g.sourceChannelId === channelId);
        if (exists) {
            return "⚠️ Este canal ya está configurado como generador";
        }

        // Crear el generador
        const generator = {
            sourceChannelId: channelId,
            namePrefix: namePrefix.trim(),
            userLimit: parseInt(userLimit) || 0,
            parentCategoryId: parentCategoryId || null,
            createdAt: new Date(),
        };

        settings.generators.push(generator);
        await settings.save();

        return `✅ Generador configurado correctamente\n
📌 **Detalles:**
• Canal: <#${channelId}>
• Prefijo: ${namePrefix}
• Límite de usuarios: ${userLimit === 0 ? "Ilimitado" : userLimit}
• Los canales temporales se crearán cuando alguien se conecte al canal de voz`;
    } catch (error) {
        console.error("[TempChannels] Error en addGenerator:", error);
        throw error;
    }
}
