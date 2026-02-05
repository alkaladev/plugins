const { 
    EmbedBuilder, 
    ApplicationCommandOptionType 
} = require("discord.js");
const { stripIndent } = require("common-tags");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "play",
    description: "music:PLAY.DESCRIPTION", // Usando el sistema de traducción
    cooldown: 5,
    command: {
        enabled: true,
        usage: "<canción>",
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "cancion",
                description: "music:PLAY.SONG_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun({ message, args }) {
        const query = args.join(" ");
        const response = await play(message, query);
        await message.reply(response);
    },

    async interactionRun({ interaction }) {
        const query = interaction.options.getString("cancion");
        const response = await play(interaction, query);
        await interaction.followUp(response);
    },
};

/**
 * @param {import('discord.js').Message|import('discord.js').ChatInputCommandInteraction} context
 * @param {string} query
 */
async function play(context, query) {
    const { guild, member, channel, client } = context;

    if (!member.voice.channel) return guild.getT("music:ERRORS.NO_VOICE");

    // Validar si ya hay un bot en otro canal
    const botVoiceChannel = guild.members.me.voice.channel;
    if (botVoiceChannel && member.voice.channel !== botVoiceChannel) {
        return guild.getT("music:ERRORS.WRONG_VOICE");
    }

    // Crear o recuperar el player usando lavalink-client
    let player = client.music.players.get(guild.id);

    if (!player) {
        player = client.music.createPlayer({
            guildId: guild.id,
            voiceChannelId: member.voice.channel.id,
            textChannelId: channel.id,
            selfDeaf: true,
            volume: 80
        });
    }

    if (!player.connected) await player.connect();

    // Buscar pistas
    const res = await player.search(query, member.user);

    if (!res.tracks.length) return guild.getT("music:ERRORS.NO_RESULTS");

    const embed = new EmbedBuilder().setColor(client.config?.EMBED_COLORS?.BOT || "#2f3136");

    if (res.loadType === "playlist") {
        player.queue.add(res.tracks);
        embed
            .setAuthor({ name: guild.getT("music:PLAY.PLAYLIST_ADDED") })
            .setDescription(stripIndent`
                **${res.playlist.name}**
                ${res.tracks.length} ${guild.getT("music:PLAY.TRACKS")}
            `)
            .setThumbnail(res.tracks[0].info.artworkUrl);
    } else {
        const track = res.tracks[0];
        player.queue.add(track);
        embed
            .setAuthor({ name: guild.getT("music:PLAY.TRACK_ADDED") })
            .setDescription(`[${track.info.title}](${track.info.uri})`)
            .setThumbnail(track.info.artworkUrl)
            .setFooter({ text: `${guild.getT("music:PLAY.REQUESTER")}: ${member.user.username}` });
    }

    // Si no está reproduciendo, darle al play
    if (!player.playing && !player.paused) {
        await player.play();
    }

    return { embeds: [embed] };
}