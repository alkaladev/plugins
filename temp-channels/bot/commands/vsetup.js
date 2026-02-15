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
                trigger: "<channelId> <nombre1> <nombre2> ... <numeroLimite>",
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
                name: "nombres",
                description: "Nombres separados por comas (ej: Alpha,Beta,Gamma)",
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

            // Validar que sea un ID válido
            if (!channelId || !/^\d+$/.test(channelId)) {
                return message.reply("❌ Debes proporcionar una ID de canal válida\n`/vsetup <channelId> <nombre1> <nombre2> ... <limite>`");
            }

            // Validar que el canal exista y sea de voz
            const channel = message.guild.channels.cache.get(channelId);
            if (!channel) {
                return message.reply("❌ No encontré un canal con esa ID");
            }

            if (channel.type !== ChannelType.GuildVoice) {
                return message.reply("❌ El canal debe ser un canal de voz");
            }

            // El último argumento debe ser el límite
            const userLimit = parseInt(args[args.length - 1]);
            if (isNaN(userLimit) || userLimit < 0 || userLimit > 99) {
                return message.reply("❌ El límite debe ser un número entre 0 y 99");
            }

            // Los nombres son todos los args entre el canal y el límite
            const names = args.slice(1, args.length - 1);
            if (names.length === 0) {
                return message.reply("❌ Debes proporcionar al menos un nombre");
            }

            const response = await addGenerator(
                message.guild.id,
                channelId,
                names,
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
            const namesString = interaction.options.getString("nombres");
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

            // Parsear los nombres separados por comas
            const names = namesString.split(",").map(n => n.trim()).filter(n => n.length > 0);
            if (names.length === 0) {
                return interaction.followUp("❌ Debes proporcionar al menos un nombre");
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
                names,
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

async function addGenerator(guildId, channelId, names, userLimit, parentCategoryId) {
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
            namesList: names,
            currentNameIndex: 0,
            userLimit: parseInt(userLimit) || 0,
            parentCategoryId: parentCategoryId || null,
            createdAt: new Date(),
        };

        settings.generators.push(generator);
        await settings.save();

        let namesDisplay = names.join(", ");
        if (names.length > 5) {
            namesDisplay = names.slice(0, 5).join(", ") + ` +${names.length - 5} más`;
        }

        return `✅ Generador configurado correctamente\n
📌 **Detalles:**
• Canal: <#${channelId}>
• Nombres: ${namesDisplay}
• Límite de usuarios: ${userLimit === 0 ? "Ilimitado" : userLimit}
• Los canales temporales se crearán cuando alguien se conecte al canal de voz`;
    } catch (error) {
        console.error("[TempChannels] Error en addGenerator:", error);
        throw error;
    }
}
