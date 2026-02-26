const { ApplicationCommandOptionType } = require("discord.js");

module.exports = {
    name: "repetir",
    description: "music:LOOP.DESCRIPTION",
    cooldown: 3,
    command: { enabled: true, usage: "<track|queue|off>" },
    slashCommand: {
        enabled: true,
        options: [{
            name: "modo",
            description: "music:LOOP.MODE_DESC",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: "Track", value: "track" },
                { name: "Queue", value: "queue" },
                { name: "Off", value: "off" }
            ]
        }],
    },

    async messageRun({ message, args }) {
        const mode = args[0]?.toLowerCase();
        const response = await loop(message, mode);
        await message.reply(response);
    },

    async interactionRun({ interaction }) {
        const mode = interaction.options.getString("modo");
        const response = await loop(interaction, mode);
        await interaction.followUp(response);
    },
};

async function loop(context, mode) {
    const { guild, member, client } = context;
    if (!member.voice.channel) return { content: guild.getT("music:ERRORS.NO_VOICE"), ephemeral: true };

    const player = client.music?.players.get(guild.id);
    if (!player) return { content: guild.getT("music:ERRORS.NO_PLAYER"), ephemeral: true };

    // En v2.2.0 el método suele ser setRepeatMode
    if (mode === "track") {
        player.setRepeatMode("track");
        return { content: "🔂 " + guild.getT("music:LOOP.TRACK") };
    } else if (mode === "queue") {
        player.setRepeatMode("queue");
        return { content: "🔁 " + guild.getT("music:LOOP.QUEUE") };
    } else {
        player.setRepeatMode("off");
        return { content: "➡️ " + guild.getT("music:LOOP.OFF") };
    }
}