// bot/comandos/reply.js
const { ApplicationCommandOptionType, ChannelType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "responder",
    description: "Responde a un mensaje específico mediante su ID",
    userPermissions: ["ManageMessages"],
    command: {
        enabled: true,
        minArgsCount: 2,
        usage: "<message_id> <texto>",
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "message_id",
                description: "El ID del mensaje al que quieres responder",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: "texto",
                description: "El contenido de tu respuesta",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun({ message, args }) {
        const messageId = args[0];
        const content = args.slice(1).join(" ");
        
        try {
            const targetMsg = await message.channel.messages.fetch(messageId);
            await targetMsg.reply(content);
            return message.reply("✅ Respondido correctamente.");
        } catch (error) {
            return message.reply("❌ No se encontró el mensaje en este canal.");
        }
    },

    async interactionRun({ interaction }) {
        const messageId = interaction.options.getString("message_id");
        const content = interaction.options.getString("texto");

        try {
            const targetMsg = await interaction.channel.messages.fetch(messageId);
            await targetMsg.reply(content);
            return interaction.followUp("✅ Respuesta enviada.");
        } catch (error) {
            return interaction.followUp("❌ No se pudo encontrar el mensaje.");
        }
    },
};