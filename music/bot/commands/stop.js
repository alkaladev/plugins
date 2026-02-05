/**
 * @type {import('strange-sdk').CommandType}
 */
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

async function stop({ guild, member, client }) {
    if (!member.voice.channel) return guild.getT("music:ERRORS.NO_VOICE");
    
    const player = client.music.players.get(guild.id);
    if (!player) return guild.getT("music:ERRORS.NO_PLAYER");

    await player.destroy();
    return guild.getT("music:STOP.SUCCESS");
}