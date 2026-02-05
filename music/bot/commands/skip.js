/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "skip",
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

async function skip({ guild, member, client }) {
    if (!member.voice.channel) return guild.getT("music:ERRORS.NO_VOICE");
    
    const player = client.music.players.get(guild.id);
    if (!player) return guild.getT("music:ERRORS.NO_PLAYER");

    await player.skip();
    return guild.getT("music:SKIP.SUCCESS");
}