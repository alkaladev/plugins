const { EmbedBuilder, ChannelType, ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
  name: "responder",
  description: "reply:RESPONDER.DESCRIPTION",
  category: "ADMIN",
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
        description: "reply:RESPONDER.ID_DESC",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "mensaje",
        description: "reply:RESPONDER.MSG_DESC",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async messageRun({ message, args }) {
    const messageId = args[0];
    const replyText = args.slice(1).join(" ").replace(/\\n/g, '\n');
    
    // Ejecutamos la lógica (esto enviará el reply y el log)
    await handleResponder(message, messageId, replyText);
    
    // Borramos el mensaje del comando si el bot tiene permisos para mantener el chat limpio
    if (message.deletable) await message.delete().catch(() => {});
  },

  async interactionRun({ interaction }) {
    const messageId = interaction.options.getString("id");
    const replyText = interaction.options.getString("mensaje").replace(/\\n/g, '\n');

    await handleResponder(interaction, messageId, replyText);
    
    // Borramos la respuesta de la interacción para que no aparezca nada en el chat
    await interaction.deleteReply().catch(() => {});
  },
};

async function handleResponder(context, messageId, replyText) {
  const { guild, client, user, member } = context;
  
  let targetMessage = null;
  const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);

  for (const [id, channel] of channels) {
    try {
      const msg = await channel.messages.fetch(messageId);
      if (msg) { targetMessage = msg; break; }
    } catch { continue; }
  }

  // Si no hay mensaje, salimos sin responder nada al canal
  if (!targetMessage) return;

  try {
    const botReply = await targetMessage.reply({
      content: replyText,
      allowedMentions: { repliedUser: true },
    });

    // Logs
    const logGuildId = '809176553404891136';
    const logChannelId = '1309900119717445745';
    const logGuild = client.guilds.cache.get(logGuildId);
    
    if (logGuild) {
      const logChannel = logGuild.channels.cache.get(logChannelId);
      if (logChannel && logChannel.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setTitle(guild.getT("reply:RESPONDER.LOG_TITLE"))
          .setColor("#3498db")
          .setTimestamp()
          .setDescription(
            `**${guild.getT("reply:RESPONDER.LOG_USER")}:** ${user?.tag || member?.user?.tag} (${user?.id || member?.id})\n` +
            `**${guild.getT("reply:RESPONDER.LOG_CHANNEL")}:** ${targetMessage.channel.name}\n` +
            `**${guild.getT("reply:RESPONDER.LOG_ORIGINAL")}:** [${guild.getT("reply:RESPONDER.JUMP")}](${targetMessage.url})\n` +
            `**${guild.getT("reply:RESPONDER.LOG_REPLY")}:** ${replyText}\n` +
            `**${guild.getT("reply:RESPONDER.LOG_BOT_LINK")}:** [${guild.getT("reply:RESPONDER.JUMP")}](${botReply.url})`
          );

        await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
      }
    }
  } catch (error) {
    console.error("Error en plugin responder:", error);
  }
}