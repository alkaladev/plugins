const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { stripIndent } = require("common-tags");
// IMPORTAMOS EL PLUGIN DIRECTAMENTE
const musicPlugin = require("../index"); 

module.exports = {
    name: "play",
    description: "music:PLAY.DESCRIPTION",
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

async function play(context, query) {
    const { guild, member, channel } = context;

    if (!member.voice.channel) return guild.getT("music:ERRORS.NO_VOICE");

    // USAMOS musicPlugin.music EN LUGAR DE client.music
    if (!musicPlugin.music) return "🚫 El sistema de música no está listo.";
    
    let player = musicPlugin.music.players.get(guild.id);

    if (!player) {
        player = musicPlugin.music.createPlayer({
            guildId: guild.id,
            voiceChannelId: member.voice.channel.id,
            textChannelId: channel.id,
            selfDeaf: true,
            volume: 80
        });
    }

    if (!player.connected) await player.connect();

    const res = await player.search(query, member.user);
    if (!res.tracks.length) return guild.getT("music:ERRORS.NO_RESULTS");

    const embed = new EmbedBuilder().setColor("#2f3136");

    if (res.loadType === "playlist") {
        player.queue.add(res.tracks);
        embed
            .setAuthor({ name: guild.getT("music:PLAY.PLAYLIST_ADDED") })
            .setDescription(stripIndent`
                **${res.playlist.name}**
                ${res.tracks.length} ${guild.getT("music:PLAY.TRACKS")}
            `);
    } else {
        const track = res.tracks[0];
        player.queue.add(track);
        embed
            .setAuthor({ name: guild.getT("music:PLAY.TRACK_ADDED") })
            .setDescription(`[${track.info.title}](${track.info.uri})`)
            .setThumbnail(track.info.artworkUrl)
            .setFooter({ text: `${guild.getT("music:PLAY.REQUESTER")}: ${member.user.username}` });
    }

    if (!player.playing && !player.paused) await player.play();

    return { embeds: [embed] };
}