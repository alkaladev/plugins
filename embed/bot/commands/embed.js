const { EmbedBuilder, ApplicationCommandOptionType, ChannelType } = require("discord.js");
const db = require("../../db.service"); // Asegúrate de que la ruta suba los niveles necesarios

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
  name: "embed",
  description: "Envía el mensaje (Embed) configurado en la Dashboard",
  category: "ADMIN",
  userPermissions: ["ManageMessages"],
  command: {
    enabled: true,
    usage: "<#canal>",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "canal",
        description: "Canal donde se enviará el embed",
        type: ApplicationCommandOptionType.Channel,
        channelTypes: [ChannelType.GuildText],
        required: true,
      },
    ],
  },

  async interactionRun({ interaction }) {
    const channel = interaction.options.getChannel("canal");
    await sendEmbed(interaction, channel);
  },

  async messageRun({ message, args }) {
    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
    if (!channel) return message.reply("Por favor, menciona un canal válido.");
    await sendEmbed(message, channel);
  },
};

/**
 * Lógica centralizada para construir y enviar el embed
 */
async function sendEmbed(context, channel) {
  // 1. Obtener la configuración de la DB
  const settings = await db.getSettings(context.guild);
  const data = settings.embed;

  // 2. Validar que haya contenido mínimo
  if (!data || (!data.title && !data.description && !data.image)) {
    const msg = "⚠️ El embed no tiene contenido configurado. Ve a la Dashboard para diseñarlo.";
    return context.deferred ? context.followUp(msg) : context.reply(msg);
  }

  try {
    // 3. Construir el EmbedBuilder
    const embed = new EmbedBuilder();

    if (data.title) embed.setTitle(data.title);
    if (data.description) embed.setDescription(data.description.replaceAll("\\n", "\n"));
    if (data.color) embed.setColor(data.color);
    if (data.image) embed.setImage(data.image);
    if (data.thumbnail) embed.setThumbnail(data.thumbnail);
    if (data.timestamp) embed.setTimestamp();

    // Autor
    if (data.author?.name) {
      embed.setAuthor({
        name: data.author.name,
        iconURL: data.author.iconURL || null
      });
    }

    // Footer
    if (data.footer?.text) {
      embed.setFooter({
        text: data.footer.text,
        iconURL: data.footer.iconURL || null
      });
    }

    // Campos (Fields)
    if (data.fields && Array.isArray(data.fields) && data.fields.length > 0) {
      embed.addFields(data.fields.map(f => ({
        name: f.name,
        value: f.value,
        inline: f.inline || false
      })));
    }

    // 4. Enviar
    await channel.send({ embeds: [embed] });

    const successMsg = `✅ Embed enviado correctamente a ${channel}`;
    return context.deferred ? context.followUp(successMsg) : context.reply(successMsg);

  } catch (error) {
    console.error("Error enviando embed:", error);
    const errorMsg = "❌ Hubo un error al intentar enviar el embed. Revisa las URLs de las imágenes.";
    return context.deferred ? context.followUp(errorMsg) : context.reply(errorMsg);
  }
}