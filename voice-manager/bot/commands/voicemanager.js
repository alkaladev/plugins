const { EmbedBuilder, ApplicationCommandOptionType, ChannelType } = require("discord.js");
const config = require("../config");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
  name: "vsetup",
  description: "Configura el canal generador de patrullas",
  category: "ADMIN",
  cooldown: 5,
  botPermissions: ["ManageChannels", "MoveMembers"],
  userPermissions: ["ManageGuild"],
  
  command: {
    enabled: true, // Al estar en true, requiere messageRun obligatoriamente
    usage: "<channel_id> <prefix> <limit>",
    minArgsCount: 3,
  },

  slashCommand: {
    enabled: true,
    options: [
      {
        name: "canal",
        description: "El canal que actuará como generador (ej. Battlefield)",
        type: ApplicationCommandOptionType.Channel,
        channel_types: [ChannelType.GuildVoice],
        required: true,
      },
      {
        name: "prefijo",
        description: "Nombre de las patrullas (ej: Patrulla )",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "limite",
        description: "Máximo de personas por patrulla",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
    ],
  },

  // Añadimos messageRun para cumplir con el SDK
  async messageRun({ message, args }) {
    const channelId = args[0];
    const prefix = args[1];
    const limit = parseInt(args[2]);

    const channel = message.guild.channels.cache.get(channelId);
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return message.reply("ID de canal de voz no válido.");
    }

    await handleSetup(message, channel, prefix, limit);
  },

  async interactionRun({ interaction }) {
    const channel = interaction.options.getChannel("canal");
    const prefix = interaction.options.getString("prefijo");
    const limit = interaction.options.getInteger("limite");

    await handleSetup(interaction, channel, prefix, limit);
  },
};

// Función auxiliar para no repetir código
async function handleSetup(context, channel, prefix, limit) {
  const newGen = {
    sourceId: channel.id,
    namePrefix: prefix,
    userLimit: limit,
    deleteDelay: 120000
  };

  const index = config.generators.findIndex(g => g.sourceId === channel.id);
  if (index !== -1) {
    config.generators[index] = newGen;
  } else {
    config.generators.push(newGen);
  }

  const embed = new EmbedBuilder()
    .setTitle("Configuración de Voz Actualizada")
    .setColor("#2ecc71")
    .setDescription(`✅ Los canales creados desde **${channel.name}** ahora se llamarán **${prefix}X** con un límite de **${limit}** usuarios.`)
    .setTimestamp();

  if (context.deferred || context.replied) {
    await context.editReply({ embeds: [embed] });
  } else {
    await context.reply({ embeds: [embed] });
  }
}