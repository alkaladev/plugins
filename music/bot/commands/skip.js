module.exports = {
    name: "saltar",
    description: "music:SKIP.DESCRIPTION",
    cooldown: 3,
    command: { enabled: true },
    slashCommand: { enabled: true },

    async messageRun({ message }) {
        const response = await skip(message);
        await message.reply(response);
    },

    async interactionRun({ interaction }) {
        const response = await skip(interaction);
        await interaction.followUp(response);
    },
};

async function skip(context) {
    const { guild, member, client } = context;

    if (!member.voice.channel) return { content: guild.getT("music:ERRORS.NO_VOICE"), ephemeral: true };

    const player = client.music?.players.get(guild.id);
    if (!player) return { content: guild.getT("music:ERRORS.NO_PLAYER"), ephemeral: true };

    try {
        await player.skip();
        return { content: "⏭️ " + guild.getT("music:SKIP.SUCCESS"), ephemeral: true };
    } catch (error) {
        return { content: `🚫 Error: ${error.message}`, ephemeral: true };
    }
}