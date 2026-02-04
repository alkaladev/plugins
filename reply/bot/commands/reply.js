const { EmbedBuilder, ChannelType, ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
  name: "responder",
  description: "Responde a un mensaje específico mediante su ID",
  category: "ADMIN", // Categoría para el sistema de ayuda
  cooldown: 5,
  botPermissions: ["SendMessages", "EmbedLinks", "ReadMessageHistory"],
  userPermissions: ["ManageMessages"],
  
  command: {
    enabled: true,
    usage: "<id> <mensaje>",
    minArgsCount: 2,
  },

  slashCommand: {
    enabled: true,
    options: [
      {
        name: "id",
        description: "El ID del mensaje al que quieres responder",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "mensaje",
        description: "El contenido de tu respuesta",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  // Para comandos de prefijo (!responder ID mensaje)
  async messageRun({ message, args }) {
    const messageId = args[0];
    const replyText = args.slice(1).join(" ").replace(/\\n/g, '\n');
    
    const response = await handleResponder(message, messageId, replyText);
    await message.reply(response);
  },

  // Para comandos de barra (/responder)
  async interactionRun({ interaction }) {
    const messageId = interaction.options.getString("id");
    const replyText = interaction.options.getString("mensaje").replace(/\\n/g, '\n');

    // Usamos followUp porque el sistema suele hacer deferReply automáticamente
    const response = await handleResponder(interaction, messageId, replyText);
    await interaction.followUp(response);
  },
};

/**
 * Lógica centralizada para buscar el mensaje y responder
 */
async function handleResponder(context, messageId, replyText) {
  const { guild, client, user, member } = context;
  
  // 1. Intentar buscar el mensaje en todos los canales de texto
  let targetMessage = null;
  const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);

  for (const [id, channel] of channels) {
    try {
      const msg = await channel.messages.fetch(messageId);
      if (msg) {
        targetMessage = msg;
        break;
      }
    } catch {
      continue; // Si no está en este canal, seguimos buscando
    }
  }

  if (!targetMessage) {
    // Aquí puedes usar traducciones si las defines en tu locale: guild.getT("reply:ERROR_ID")
    return "❌ No se pudo encontrar ningún mensaje con ese ID en este servidor.";
  }

  try {
    // 2. Responder al mensaje
    const botReply = await targetMessage.reply({
      content: replyText,
      allowedMentions: { repliedUser: true },
    });

    // 3. Sistema de Logs (IDs que proporcionaste)
    const logGuildId = '809176553404891136';
    const logChannelId = '1309900119717445745';
    const logGuild = client.guilds.cache.get(logGuildId);
    
    if (logGuild) {
      const logChannel = logGuild.channels.cache.get(logChannelId);
      if (logChannel && logChannel.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setTitle("Mensaje respondido con el BOT")
          .setColor("#3498db")
          .setTimestamp()
          .setDescription(
            `**Usuario:** ${user?.tag || member?.user?.tag} (${user?.id || member?.id})\n` +
            `**Canal:** ${targetMessage.channel.name}\n` +
            `**Mensaje Original:** [Saltar al mensaje](${targetMessage.url})\n` +
            `**Tu respuesta:** ${replyText}\n` +
            `**Enlace del Bot:** [Ir al mensaje](${botReply.url})`
          );

        await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
      }
    }

    return "✅ Respuesta enviada con éxito.";
  } catch (error) {
    console.error(error);
    return "❌ Error al intentar responder al mensaje.";
  }
}