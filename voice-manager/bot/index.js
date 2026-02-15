const { BotPlugin } = require("strange-sdk");
const { ChannelType, Collection } = require("discord.js");
const config = require("./config");

// Mapa para gestionar los borradores pendientes (ID_Canal => Timeout)
const deleteQueue = new Collection();

module.exports = new BotPlugin({
  name: "voice-manager",
  dependencies: [],
  baseDir: __dirname,

  async boot(client) {
    client.on("voiceStateUpdate", async (oldState, newState) => {
      const { guild, member } = newState;
      const oldChannel = oldState.channel;
      const newChannel = newState.channel;

      // --- LÓGICA DE CREACIÓN: Al entrar al canal "Generador" ---
      const generator = config.generators.find(g => g.sourceId === newChannel?.id);

      if (generator) {
        // Contamos cuántos canales con ese prefijo existen en la categoría para el número
        const existingPatrols = guild.channels.cache.filter(c => 
          c.name.startsWith(generator.namePrefix) && 
          c.parentId === newChannel.parentId
        ).size;

        try {
          const newVoiceChannel = await guild.channels.create({
            name: `${generator.namePrefix}${existingPatrols + 1}`,
            type: ChannelType.GuildVoice,
            parent: newChannel.parentId,
            userLimit: generator.userLimit,
            reason: 'Voice Manager: Creación de patrulla automática'
          });

          // Movemos al usuario al nuevo canal
          return await member.voice.setChannel(newVoiceChannel);
        } catch (error) {
          console.error("Error creando canal temporal:", error);
        }
      }

      // --- LÓGICA DE BORRADO: Al salir de un canal temporal ---
      // Verificamos si el canal que abandonó era una "Patrulla" y está vacío
      const isTemporary = config.generators.some(g => oldChannel?.name.startsWith(g.namePrefix));
      
      if (oldChannel && isTemporary && oldChannel.members.size === 0) {
        const genConfig = config.generators.find(g => oldChannel.name.includes(g.namePrefix));
        const delay = genConfig?.deleteDelay || 120000; // 2 minutos por defecto

        // Programamos el borrado
        const timeout = setTimeout(async () => {
          try {
            // Refrescamos el estado del canal para ver si sigue vacío
            const channelCheck = await guild.channels.fetch(oldChannel.id).catch(() => null);
            if (channelCheck && channelCheck.members.size === 0) {
              await channelCheck.delete('Voice Manager: Canal temporal vacío');
              deleteQueue.delete(oldChannel.id);
            }
          } catch (err) {
            // El canal podría haber sido borrado manualmente, ignoramos el error
          }
        }, delay);

        deleteQueue.set(oldChannel.id, timeout);
      }

      // --- LÓGICA DE CANCELACIÓN: Si alguien entra antes de que se borre ---
      if (newChannel && deleteQueue.has(newChannel.id)) {
        clearTimeout(deleteQueue.get(newChannel.id));
        deleteQueue.delete(newChannel.id);
      }
    });
  },
});