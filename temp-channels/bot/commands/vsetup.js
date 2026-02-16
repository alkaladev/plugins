const { ApplicationCommandOptionType, ChannelType, EmbedBuilder } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "vsetup",
    description: "tempchannels:VSETUP.DESCRIPTION",
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

            if (!channelId || !/^\d+$/.test(channelId)) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Debes proporcionar una ID de canal válida");
                return message.reply({ embeds: [embed] });
            }

            const channel = message.guild.channels.cache.get(channelId);
            if (!channel) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ No encontré un canal con esa ID");
                return message.reply({ embeds: [embed] });
            }

            if (channel.type !== ChannelType.GuildVoice) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ El canal debe ser un canal de voz");
                return message.reply({ embeds: [embed] });
            }

            const userLimit = parseInt(args[args.length - 1]);
            if (isNaN(userLimit) || userLimit < 0 || userLimit > 99) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ El límite debe ser un número entre 0 y 99");
                return message.reply({ embeds: [embed] });
            }

            const names = args.slice(1, args.length - 1);
            if (names.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Debes proporcionar al menos un nombre");
                return message.reply({ embeds: [embed] });
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
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error configurando el generador");
            return message.reply({ embeds: [embed] });
        }
    },

    async interactionRun({ interaction }) {
        try {
            const channelId = interaction.options.getString("canal");
            const namesString = interaction.options.getString("nombres");
            const userLimit = interaction.options.getInteger("limite");
            const categoryId = interaction.options.getString("categoria");

            if (!channelId || !/^\d+$/.test(channelId)) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Debes proporcionar una ID de canal válida");
                return interaction.followUp({ embeds: [embed] });
            }

            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ No encontré un canal con esa ID");
                return interaction.followUp({ embeds: [embed] });
            }

            if (channel.type !== ChannelType.GuildVoice) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ El canal debe ser un canal de voz");
                return interaction.followUp({ embeds: [embed] });
            }

            const names = namesString.split(",").map(n => n.trim()).filter(n => n.length > 0);
            if (names.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Debes proporcionar al menos un nombre");
                return interaction.followUp({ embeds: [embed] });
            }

            if (userLimit < 0 || userLimit > 99) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ El límite debe ser un número entre 0 y 99");
                return interaction.followUp({ embeds: [embed] });
            }

            if (categoryId) {
                const category = interaction.guild.channels.cache.get(categoryId);
                if (!category || category.type !== ChannelType.GuildCategory) {
                    const embed = new EmbedBuilder()
                        .setColor("#fd3b02")
                        .setDescription("❌ La categoría no existe o es inválida");
                    return interaction.followUp({ embeds: [embed] });
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
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error configurando el generador");
            return interaction.followUp({ embeds: [embed] });
        }
    },
};

async function addGenerator(guildId, channelId, names, userLimit, parentCategoryId) {
    try {
        const settings = await db.getSettings(guildId);

        const exists = settings.generators.some((g) => g.sourceChannelId === channelId);
        if (exists) {
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("⚠️ Este canal ya está configurado como generador");
            return { embeds: [embed] };
        }

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

        const embed = new EmbedBuilder()
            .setColor("#fd3b02")
            .setTitle("✅ Generador configurado correctamente")
            .setDescription(`<#${channelId}>\n\n**Nombres:** ${namesDisplay}\n**Límite:** ${userLimit === 0 ? "Ilimitado" : userLimit} usuarios\n\nLos canales temporales se crearán cuando alguien se conecte al canal de voz`);

        return { embeds: [embed] };
    } catch (error) {
        console.error("[TempChannels] Error en addGenerator:", error);
        throw error;
    }
}
