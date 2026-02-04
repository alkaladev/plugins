const {
  ApplicationCommandOptionType,
  ChannelType,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} = require("discord.js");
const { MiscUtils } = require("strange-sdk/utils");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
  name: "embed",
  description: "Crea y envía un mensaje personalizado (Embed)",
  category: "ADMIN",
  userPermissions: ["ManageMessages"],
  command: {
    enabled: true,
    usage: "<#canal>",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    ephemeral: true,
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

  async messageRun({ message, args }) {
    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
    if (!channel || channel.type !== ChannelType.GuildText) {
      return message.reply("Por favor, proporciona un canal de texto válido.");
    }
    
    if (!channel.permissionsFor(message.guild.members.me).has("EmbedLinks")) {
      return message.reply("No tengo permiso para enviar Embeds en ese canal.");
    }

    await message.reply(`Configuración iniciada en ${channel}`);
    await embedSetup(channel, message.member);
  },

  async interactionRun({ interaction }) {
    const channel = interaction.options.getChannel("canal");

    if (!channel.permissionsFor(interaction.guild.members.me).has("EmbedLinks")) {
      return interaction.followUp("No tengo permiso para enviar Embeds en ese canal.");
    }

    await interaction.followUp(`Configuración iniciada en ${channel}`);
    await embedSetup(channel, interaction.member);
  },
};

/**
 * @param {import('discord.js').GuildTextBasedChannel} channel
 * @param {import('discord.js').GuildMember} member
 */
async function embedSetup(channel, member) {
  const sentMsg = await channel.send({
    content: "Presiona el botón para diseñar tu mensaje.",
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("EMBED_ADD").setLabel("Empezar Diseño").setStyle(ButtonStyle.Primary)
      ),
    ],
  });

  const btnInteraction = await channel
    .awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) => i.customId === "EMBED_ADD" && i.member.id === member.id,
      time: 30000,
    })
    .catch(() => null);

  if (!btnInteraction) return sentMsg.edit({ content: "Tiempo agotado.", components: [] });

  // MODAL INICIAL CON IMAGEN Y THUMBNAIL
  await btnInteraction.showModal(
    new ModalBuilder({
      customId: "EMBED_MODAL",
      title: "Generador de Embeds",
      components: [
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("title").setLabel("Título").setStyle(TextInputStyle.Short).setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("description").setLabel("Descripción").setStyle(TextInputStyle.Paragraph).setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("image").setLabel("URL de la Imagen Grande").setStyle(TextInputStyle.Short).setPlaceholder("https://...").setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("thumbnail").setLabel("URL del Thumbnail (Pequeña)").setStyle(TextInputStyle.Short).setPlaceholder("https://...").setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("color").setLabel("Color Hex").setStyle(TextInputStyle.Short).setPlaceholder("#5865F2").setRequired(false)
        ),
      ],
    })
  );

  const modal = await btnInteraction
    .awaitModalSubmit({
      time: 3 * 60 * 1000,
      filter: (m) => m.customId === "EMBED_MODAL" && m.member.id === member.id,
    })
    .catch(() => null);

  if (!modal) return sentMsg.edit({ content: "Cancelado por falta de respuesta.", components: [] });

  await modal.reply({ content: "Cargando previsualización...", ephemeral: true });

  const title = modal.fields.getTextInputValue("title");
  const description = modal.fields.getTextInputValue("description");
  const image = modal.fields.getTextInputValue("image");
  const thumbnail = modal.fields.getTextInputValue("thumbnail");
  const color = modal.fields.getTextInputValue("color");

  const embed = new EmbedBuilder();
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (image && MiscUtils.isURL(image)) embed.setImage(image);
  if (thumbnail && MiscUtils.isURL(thumbnail)) embed.setThumbnail(thumbnail);
  if (color && MiscUtils.isHex(color)) embed.setColor(color);
  else embed.setColor("#2f3136"); // Color oscuro por defecto si no hay uno válido

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("EMBED_FIELD_ADD").setLabel("Añadir Campo").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("EMBED_FIELD_REM").setLabel("Quitar Campo").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("EMBED_FIELD_DONE").setLabel("Enviar Ahora").setStyle(ButtonStyle.Primary)
  );

  await sentMsg.edit({
    content: "Usa los botones para gestionar campos extras o enviar el resultado final.",
    embeds: [embed],
    components: [buttonRow],
  });

  const collector = channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.member.id === member.id,
    message: sentMsg,
    idle: 5 * 60 * 1000,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.customId === "EMBED_FIELD_ADD") {
      await interaction.showModal(
        new ModalBuilder({
          customId: "EMBED_ADD_FIELD_MODAL",
          title: "Nuevo Campo",
          components: [
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("name").setLabel("Título del campo").setStyle(TextInputStyle.Short).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("value").setLabel("Valor del campo").setStyle(TextInputStyle.Paragraph).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("inline").setLabel("¿En la misma fila? (true/false)").setStyle(TextInputStyle.Short).setValue("true")
            ),
          ],
        })
      );

      const fieldModal = await interaction
        .awaitModalSubmit({
          time: 60000,
          filter: (m) => m.customId === "EMBED_ADD_FIELD_MODAL" && m.member.id === member.id,
        })
        .catch(() => null);

      if (fieldModal) {
        const name = fieldModal.fields.getTextInputValue("name");
        const value = fieldModal.fields.getTextInputValue("value");
        const inline = fieldModal.fields.getTextInputValue("inline").toLowerCase() === "true";

        embed.addFields({ name, value, inline });
        await fieldModal.reply({ content: "Campo añadido.", ephemeral: true });
        await sentMsg.edit({ embeds: [embed] });
      }
    } else if (interaction.customId === "EMBED_FIELD_REM") {
      const fields = embed.data.fields || [];
      if (fields.length > 0) {
        fields.pop();
        embed.setFields(fields);
        await interaction.reply({ content: "Último campo eliminado.", ephemeral: true });
        await sentMsg.edit({ embeds: [embed] });
      } else {
        await interaction.reply({ content: "No hay campos para eliminar.", ephemeral: true });
      }
    } else if (interaction.customId === "EMBED_FIELD_DONE") {
      collector.stop("done");
    }
  });

  collector.on("end", async (_, reason) => {
    if (reason === "done") {
      await sentMsg.edit({ content: null, embeds: [embed], components: [] });
    } else {
      await sentMsg.edit({ content: "⌛ La sesión de edición ha expirado.", components: [], embeds: [] });
    }
  });
}