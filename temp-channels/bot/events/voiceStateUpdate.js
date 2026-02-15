const { ChannelType } = require("discord.js");
const db = require("../../db.service");

module.exports = async (oldState, newState) => {
    const { guild, member } = newState;
    if (member.user.bot) return;

    const settings = await db.getSettings(guild.id);

    // LÓGICA: CREAR CANAL (Al entrar a un generador)
    if (newState.channelId) {
        const gen = settings.generators.find(g => g.sourceId === newState.channelId);
        if (gen) {
            const newChannel = await guild.channels.create({
                name: `${gen.namePrefix} ${member.displayName}`,
                type: ChannelType.GuildVoice,
                parent: newState.channel.parentId,
                userLimit: gen.userLimit || 0,
                reason: "Canal temporal creado por temp-channels"
            });
            await member.voice.setChannel(newChannel);
        }
    }

    // LÓGICA: BORRAR CANAL (Al salir y quedar vacío)
    if (oldState.channel && oldState.channel.members.size === 0) {
        const isTemp = settings.generators.some(g => oldState.channel.name.startsWith(g.namePrefix));
        if (isTemp) {
            await oldState.channel.delete().catch(() => {});
        }
    }
};