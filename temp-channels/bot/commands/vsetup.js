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
                trigger: "<channelId> <nombre> <numero>",
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
                description: "ID del canal de voz que actuará como generador",
                type: ApplicationCommandOptionType.String,
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
                description: "ID de la categoría donde crear los canales (opcional)",
                type: ApplicationCommandOptionType.String,
                required: false,
            },
        ],
    },

    async messageRun({ message, args }) {
        try {
            const channelId = args[0];
            const namePrefix = args[1];
            const userLimit = parseInt(args[2]);

            // Validar que sea un ID válido
            if (!channelId || !/^\d+$/.test(channelId)) {
                return message.reply("❌ Debes proporcionar una ID de canal válida\n`/vsetup <channelId> <nombre> <limite>`");
            }

            // Validar que el canal exista y sea de voz
            const channel = message.guild.channels.cache.get(channelId);
            if (!channel) {
                return message.reply("❌ No encontré un canal con esa ID");
            }

            if (channel.type !== ChannelType.GuildVoice) {
                return message.reply("❌ El canal debe ser un canal de voz");
            }

            // Validar nombre
            if (!namePrefix || namePrefix.length > 20) {
                return message.reply("❌ El nombre debe tener entre 1 y 20 caracteres");
            }

            // Validar límite
            if (isNaN(userLimit) || userLimit < 0 || userLimit > 99) {
                return message.reply("❌ El límite debe ser un número entre 0 y 99");
            }

            const response = await addGenerator(
                message.guild.id,
                channelId,
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
            const channelId = interaction.options.getString("canal");
            const namePrefix = interaction.options.getString("nombre");
            const userLimit = interaction.options.getInteger("limite");
            const categoryId = interaction.options.getString("categoria");

            // Validar que sea un ID válido
            if (!channelId || !/^\d+$/.test(channelId)) {
                return interaction.followUp("❌ Debes proporcionar una ID de canal válida");
            }

            // Validar que el canal exista y sea de voz
            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) {
                return interaction.followUp("❌ No encontré un canal con esa ID");
            }

            if (channel.type !== ChannelType.GuildVoice) {
                return interaction.followUp("❌ El canal debe ser un canal de voz");
            }

            // Validar nombre
            if (!namePrefix || namePrefix.length > 20) {
                return interaction.followUp("❌ El nombre debe tener entre 1 y 20 caracteres");
            }

            // Validar límite
            if (userLimit < 0 || userLimit > 99) {
                return interaction.followUp("❌ El límite debe ser un número entre 0 y 99");
            }

            // Validar categoría si se proporciona
            if (categoryId) {
                const category = interaction.guild.channels.cache.get(categoryId);
                if (!category || category.type !== ChannelType.GuildCategory) {
                    return interaction.followUp("❌ La categoría no existe o es inválida");
                }
            }

            const response = await addGenerator(
                interaction.guild.id,
                channelId,
                namePrefix,
                userLimit,
                categoryId || null,
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
