const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { stripIndent } = require("common-tags");
// IMPORTAMOS EL PLUGIN DIRECTAMENTE
const musicPlugin = require("../index"); 

/**
 * @type {import('strange-sdk').CommandType}
 */
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

    // --- LOGS DE DEPURACIÓN ---
    console.log("--- DEBUG MUSIC COMMAND ---");
    console.log("1. ¿musicPlugin existe?:", !!musicPlugin);
    console.log("2. ¿musicPlugin.music tiene valor?:", !!(musicPlugin && musicPlugin.music));
    console.log("3. ¿client.music tiene valor?:", !!client.music);
    console.log("---------------------------");

    if (!member.voice.channel) return guild.getT("music:ERRORS.NO_VOICE");

    // Intentamos obtener el manager de cualquiera de los dos sitios
    const musicManager = (musicPlugin && musicPlugin.music) || client.music;

    if (!musicManager) {
        return "🚫 El sistema de música no está listo. Revisa los logs de la consola.";
    }
    
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

    try {
        if (!player.connected) await player.connect();

        const res = await player.search(query, member.user);
        if (!res.tracks || !res.tracks.length) return guild.getT("music:ERRORS.NO_RESULTS");

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

    } catch (error) {
        console.error("Error en el comando Play:", error);
        return "🚫 Ocurrió un error al intentar reproducir la canción.";
    }
}