module.exports = {
    name: "pausa",
    description: "music:PAUSE.DESCRIPTION",
    cooldown: 3,
    command: { enabled: true },
    slashCommand: { enabled: true },

    async messageRun({ message }) {
        const response = await pause(message);
        await message.reply(response);
    },

    async interactionRun({ interaction }) {
        const response = await pause(interaction);
        await interaction.followUp(response);
    },
};

async function pause(context) {
    const { guild, member, client } = context;
    if (!member.voice.channel) return { content: guild.getT("music:ERRORS.NO_VOICE"), ephemeral: true };

    const player = client.music?.players.get(guild.id);
    if (!player) return { content: guild.getT("music:ERRORS.NO_PLAYER"), ephemeral: true };
    if (player.paused) return { content: guild.getT("music:PAUSE.ALREADY_PAUSED"), ephemeral: true };

    await player.pause(true);

    // Forzamos la actualización del status inmediatamente
    if (player.queue.current) {
        const status = `Pausado **${player.queue.current.info.title}**`.substring(0, 50);
        await client.music.updateVoiceStatus(player.voiceChannelId, status);
    }

    return { content: "⏸️ " + guild.getT("music:PAUSE.SUCCESS") };
}