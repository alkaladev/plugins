const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "cola",
  description: "music:QUEUE.DESCRIPTION",
  cooldown: 5,
  command: { enabled: true, aliases: ["q"] },
  slashCommand: { enabled: true },

  async messageRun({ message }) {
    const response = await getQueue(message);
    await message.reply(response);
  },

  async interactionRun({ interaction }) {
    const response = await getQueue(interaction);
    await interaction.followUp(response);
  },
};

async function getQueue(context) {
  const { guild, client } = context;
  const player = client.music?.players.get(guild.id);

  if (!player || !player.queue.current) {
    return { content: guild.getT("music:ERRORS.NO_PLAYER") };
  }

  // IMPORTANTE: Accedemos a player.queue.tracks que sí es un Array
  const tracks = player.queue.tracks || []; 
  const current = player.queue.current;

  const embed = new EmbedBuilder()
    .setTitle(guild.getT("music:QUEUE.TITLE"))
    .setColor("#5865F2")
    .setDescription(`**${guild.getT("music:QUEUE.CURRENT")}**\n[${current.info.title}](${current.info.uri})\n\n**${guild.getT("music:QUEUE.UP_NEXT")}**`)
    .setThumbnail(current.info.artworkUrl || null);

  if (tracks.length === 0) {
    embed.addFields({ name: "\u200b", value: guild.getT("music:QUEUE.EMPTY") });
  } else {
    // Tomamos las primeras 10 canciones de la cola
    const nextTracks = tracks.slice(0, 10).map((track, index) => {
      return `\`${index + 1}.\` [${track.info.title}](${track.info.uri})`;
    }).join("\n");

    embed.addFields({ name: "\u200b", value: nextTracks });

    if (tracks.length > 10) {
      embed.setFooter({ text: `+${tracks.length - 10} canciones más...` });
    }
  }

  return { embeds: [embed] };
}