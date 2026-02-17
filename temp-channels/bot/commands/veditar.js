const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "veditar",
    description: "edita la configuración de un generador existente",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        minArgsCount: 2,
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
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ ID de canal inválida");
                return message.reply({ embeds: [embed] });
            }

            const channel = message.guild.channels.cache.get(channelId);
            if (!channel) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Canal no encontrado");
                return message.reply({ embeds: [embed] });
            }

            // Parsear nombres y límite del mensaje
            let namesString = null;
            let newLimit = null;

            for (let i = 1; i < args.length; i++) {
                if (!isNaN(args[i])) {
                    newLimit = parseInt(args[i]);
                } else {
                    namesString = args.slice(1).join(" ");
                    break;
                }
            }

            const response = await editGenerator(message.guild.id, channelId, message.guild, namesString, newLimit);
            return message.reply(response);
        } catch (error) {
            console.error("[TempChannels] Error:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error editando el generador");
            return message.reply({ embeds: [embed] });
        }
    },

    async interactionRun({ interaction }) {
        try {
            const channelId = interaction.options.getString("canal");
            const namesString = interaction.options.getString("nombres");
            const newLimit = interaction.options.getInteger("limite");

            if (!channelId || !/^\d+$/.test(channelId)) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ ID de canal inválida");
                return interaction.followUp({ embeds: [embed] });
            }

            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ Canal no encontrado");
                return interaction.followUp({ embeds: [embed] });
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
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Ocurrió un error editando el generador");
            return interaction.followUp({ embeds: [embed] });
        }
    },
};

async function editGenerator(guildId, channelId, guild, namesString, newLimit) {
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
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("⚠️ Debes especificar al menos un cambio (nombres o límite)");
            return { embeds: [embed] };
        }

        await settings.save();

        const embed = new EmbedBuilder()
            .setColor("#fd3b02")
            .setTitle("✅ Generador editado correctamente")
            .setDescription(changes.join("\n"));

        return { embeds: [embed] };
    } catch (error) {
        console.error("[TempChannels] Error en editGenerator:", error);
        throw error;
    }
}
