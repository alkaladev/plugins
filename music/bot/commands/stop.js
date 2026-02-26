module.exports = {
    name: "stop",
    description: "music:STOP.DESCRIPTION",
    cooldown: 3,
    command: { enabled: true },
    slashCommand: { enabled: true },

    async messageRun({ message }) {
        const response = await stop(message);
        await message.reply(response);
    },

    async interactionRun({ interaction }) {
        const response = await stop(interaction);
        await interaction.followUp(response);
    },
};

async function stop(context) {
    const { guild, member, client } = context;

    if (!member.voice.channel) return { content: guild.getT("music:ERRORS.NO_VOICE"), ephemeral: true };

    const player = client.music?.players.get(guild.id);
    if (!player) return { content: guild.getT("music:ERRORS.NO_PLAYER"), ephemeral: true };

    try {
        await player.destroy();
        return { content: "⏹️ " + guild.getT("music:STOP.SUCCESS"), ephemeral: true };
    } catch (error) {
        return { content: `🚫 Error: ${error.message}`, ephemeral: true };
    }
}