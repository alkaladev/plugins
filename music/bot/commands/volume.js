const { ApplicationCommandOptionType } = require("discord.js");

module.exports = {
    name: "volumen",
    description: "music:VOLUME.DESCRIPTION",
    cooldown: 3,
    command: { enabled: true, usage: "<0-100>" },
    slashCommand: {
        enabled: true,
        options: [{
            name: "cantidad",
            description: "music:VOLUME.VALUE_DESC",
            type: ApplicationCommandOptionType.Integer,
            required: false,
        }],
    },

    async messageRun({ message, args }) {
        const amount = args[0] ? parseInt(args[0]) : null;
        const response = await volume(message, amount);
        await message.reply(response);
    },

    async interactionRun({ interaction }) {
        const amount = interaction.options.getInteger("cantidad");
        const response = await volume(interaction, amount);
        await interaction.followUp(response);
    },
};

async function volume(context, amount) {
    const { guild, member, client } = context;
    if (!member.voice.channel) return { content: guild.getT("music:ERRORS.NO_VOICE"), ephemeral: true };

    const player = client.music?.players.get(guild.id);
    if (!player) return { content: guild.getT("music:ERRORS.NO_PLAYER"), ephemeral: true };

    if (!amount && amount !== 0) {
        return { content: `🔊 ${guild.getT("music:VOLUME.CURRENT")}: **${player.volume}%**` };
    }

    if (amount < 0 || amount > 100) return { content: guild.getT("music:VOLUME.INVALID_RANGE"), ephemeral: true };

    await player.setVolume(amount);
    return { content: `✅ ${guild.getT("music:VOLUME.SUCCESS")}: **${amount}%**` };
}