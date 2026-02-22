module.exports = {
    name: "reanudar",
    description: "music:RESUME.DESCRIPTION",
    cooldown: 3,
    command: { enabled: true },
    slashCommand: { enabled: true },

    async messageRun({ message }) {
        const response = await resume(message);
        await message.reply(response);
    },

    async interactionRun({ interaction }) {
        const response = await resume(interaction);
        await interaction.followUp(response);
    },
};

async function resume(context) {
    const { guild, member, client } = context;
    if (!member.voice.channel) return { content: guild.getT("music:ERRORS.NO_VOICE"), ephemeral: true };

    const player = client.music?.players.get(guild.id);
    if (!player) return { content: guild.getT("music:ERRORS.NO_PLAYER"), ephemeral: true };
    if (!player.paused) return { content: guild.getT("music:RESUME.ALREADY_RESUMED"), ephemeral: true };

    // Intentar reanudar
    if (typeof player.resume === "function") await player.resume();
    else await player.pause(false);

    // Forzamos la actualización del status inmediatamente
    if (player.queue.current) {
        const status = `Sonando Ahora **${player.queue.current.info.title}**`.substring(0, 50);
        await client.music.updateVoiceStatus(player.voiceChannelId, status);
    }

    return { content: "▶️ " + guild.getT("music:RESUME.SUCCESS") };
}