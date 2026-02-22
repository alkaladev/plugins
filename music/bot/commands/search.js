const { 
    EmbedBuilder, 
    ApplicationCommandOptionType, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ComponentType 
} = require("discord.js");
const musicPlugin = require("../index");

module.exports = {
    name: "buscar",
    description: "music:SEARCH.DESCRIPTION",
    cooldown: 5,
    command: { 
        enabled: true, 
        usage: "<término>",
        minArgsCount: 1 
    },
    slashCommand: {
        enabled: true,
        options: [{
            name: "query",
            description: "music:SEARCH.QUERY_DESC",
            type: ApplicationCommandOptionType.String,
            required: true,
        }],
    },

    async messageRun({ message, args }) {
        const query = args.join(" ");
        await search(message, query);
    },

    async interactionRun({ interaction }) {
        const query = interaction.options.getString("query");
        await search(interaction, query);
    },
};

async function search(context, query) {
    const { guild, member, client, channel } = context;
    const isInteraction = !!context.isChatInputCommand;

    if (!member.voice.channel) {
        const msg = { content: guild.getT("music:ERRORS.NO_VOICE"), ephemeral: true };
        return isInteraction ? context.followUp(msg) : context.reply(msg);
    }

    const musicManager = musicPlugin.getManager() || client.music;
    
    // Necesitamos un player para buscar
    let player = musicManager.players.get(guild.id);
    if (!player) {
        player = musicManager.createPlayer({
            guildId: guild.id,
            voiceChannelId: member.voice.channel.id,
            textChannelId: channel.id,
            selfDeaf: true,
        });
    }

    if (!player.connected) await player.connect();

    try {
        const res = await player.search(query, member.user);

        if (!res || !res.tracks || res.tracks.length === 0) {
            const msg = { content: guild.getT("music:ERRORS.NO_RESULTS"), ephemeral: true };
            return isInteraction ? context.followUp(msg) : context.reply(msg);
        }

        // Tomamos los primeros 10 resultados para el menú
        const tracks = res.tracks.slice(0, 20);

        const menu = new StringSelectMenuBuilder()
            .setCustomId("search_select")
            .setPlaceholder("Selecciona una canción para reproducir")
            .addOptions(tracks.map((track, index) => ({
                label: `${index + 1}. ${track.info.title}`.substring(0, 100),
                description: track.info.author.substring(0, 100),
                value: index.toString(),
            })));

        const row = new ActionRowBuilder().addComponents(menu);

        const embed = new EmbedBuilder()
            .setColor("#2f3136")
            .setTitle("🔍 Resultados de búsqueda")
            .setDescription(`He encontrado ${tracks.length} resultados para: **${query}**\nSelecciona uno en el menú de abajo.`);

        const response = isInteraction 
            ? await context.followUp({ embeds: [embed], components: [row] })
            : await context.reply({ embeds: [embed], components: [row] });

        // Colector para capturar la selección
        const collector = response.createMessageComponentCollector({
            filter: (i) => i.user.id === member.id && i.customId === "search_select",
            componentType: ComponentType.StringSelect,
            time: 30000,
        });

        collector.on("collect", async (i) => {
            const selectedIndex = parseInt(i.values[0]);
            const selectedTrack = tracks[selectedIndex];

            player.queue.add(selectedTrack);
            if (!player.playing && !player.paused) await player.play();

            const successEmbed = new EmbedBuilder()
                .setColor("#2f3136")
                .setTitle("✅ Canción seleccionada")
                .setDescription(`[${selectedTrack.info.title}](${selectedTrack.info.uri})`)
                .setThumbnail(selectedTrack.info.artworkUrl || null)
                .setFooter({ text: `Añadido por ${member.user.username}` });

            await i.update({ embeds: [successEmbed], components: [] });
            collector.stop();
        });

        collector.on("end", async (collected, reason) => {
            if (reason === "time") {
                await response.edit({ content: "⌛ El tiempo de búsqueda ha expirado.", embeds: [], components: [] }).catch(() => null);
            }
        });

    } catch (error) {
        console.error("[MUSIC-SEARCH] Error:", error);
        const errorMsg = { content: "🚫 Error al realizar la búsqueda.", ephemeral: true };
        return isInteraction ? context.followUp(errorMsg) : context.reply(errorMsg);
    }
}