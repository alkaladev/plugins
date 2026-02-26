const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { stripIndent } = require("common-tags");
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
    const { guild, member, channel, client } = context;

    if (!member.voice.channel) {
        return { content: guild.getT("music:ERRORS.NO_VOICE"), ephemeral: true };
    }

    // Intentamos obtener el manager de varias formas para asegurar compatibilidad
    const musicManager = musicPlugin.getManager() || client.music;
    
    if (!musicManager) {
        return { content: "🚫 El sistema de música no está listo.", ephemeral: true };
    }

    try {
        let player = musicManager.players.get(guild.id);

        if (!player) {
            player = musicManager.createPlayer({
                guildId: guild.id,
                voiceChannelId: member.voice.channel.id,
                textChannelId: channel.id,
                selfDeaf: true,
                volume: 80
            });
        }

        if (!player.connected) await player.connect();        
        const res = await player.search(query, member.user);

        if (!res || !res.tracks || res.tracks.length === 0 || res.loadType === "error") {
            return { content: guild.getT("music:ERRORS.NO_RESULTS"), ephemeral: true };
        }

        const embed = new EmbedBuilder().setColor("#2f3136").setAuthor({ name: "🎵 Sistema de Música" });

        if (res.loadType === "playlist") {
            player.queue.add(res.tracks);
            embed.setTitle(guild.getT("music:PLAY.PLAYLIST_ADDED"))
                 .setDescription(stripIndent`
                    **${res.playlist.name}**
                    ${res.tracks.length} ${guild.getT("music:PLAY.TRACKS")}
                `);
        } else {
            const track = res.tracks[0];
            player.queue.add(track);
            embed.setTitle(guild.getT("music:PLAY.TRACK_ADDED"))
                 .setDescription(`[${track.info.title}](${track.info.uri})`)
                 .setThumbnail(track.info.artworkUrl || null);
        }

        if (!player.playing && !player.paused) await player.play();

        return { embeds: [embed] };

    } catch (error) {
        return { content: `🚫 Error: ${error.message}`, ephemeral: true };
    }
}