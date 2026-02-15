const { BotPlugin } = require("strange-sdk");
const { ChannelType, Collection } = require("discord.js");
const config = require("./config");

/**
 * Mapa para gestionar las colas de borrado de canales temporales
 * @type {Collection<string, NodeJS.Timeout>}
 */
const deleteQueue = new Collection();

module.exports = new BotPlugin({
  name: "voice-manager",
  baseDir: __dirname,

  async boot(client) {
    const logger = client.logger || console;
    
    logger.info("[Voice Manager] El plugin ha sido cargado correctamente.");

    client.on("voiceStateUpdate", async (oldState, newState) => {
      const { guild, member } = newState;
      const newChannel = newState.channel;
      const oldChannel = oldState.channel;

      // --- 1. LÓGICA DE CREACIÓN ---
      // Verificamos si el canal al que entra el usuario es un generador configurado
      const generator = config.generators.find(g => g.sourceId === newChannel?.id);

      if (generator) {
        logger.info(`[Voice Manager] ${member.user.tag} entró en un generador (${newChannel.name}).`);

        try {
          // Contamos cuántas patrullas existen ya con ese nombre para la numeración
          const existingPatrols = guild.channels.cache.filter(c => 
            c.name.startsWith(generator.namePrefix) && 
            c.parentId === newChannel.parentId
          ).size;

          // Creamos el nuevo canal de voz
          const newVoiceChannel = await guild.channels.create({
            name: `${generator.namePrefix}${existingPatrols + 1}`,
            type: ChannelType.GuildVoice,
            parent: newChannel.parentId,
            userLimit: generator.userLimit,
            reason: 'Voice Manager: Creación de patrulla automática'
          });

          logger.info(`[Voice Manager] Canal "${newVoiceChannel.name}" creado con éxito.`);

          // Movemos al miembro al nuevo canal
          return await member.voice.setChannel(newVoiceChannel);
        } catch (error) {
          logger.error("[Voice Manager] Error al intentar crear o mover al usuario:", error);
        }
      }

      // --- 2. LÓGICA DE BORRADO ---
      // Verificamos si el usuario salió de un canal que es una patrulla temporal
      if (oldChannel) {
        const genConfig = config.generators.find(g => oldChannel.name.startsWith(g.namePrefix));
        
        // Si el canal es temporal y se ha quedado vacío
        if (genConfig && oldChannel.members.size === 0) {
          logger.info(`[Voice Manager] El canal "${oldChannel.name}" está vacío. Borrado programado.`);

          const delay = genConfig.deleteDelay || 120000;

          const timeout = setTimeout(async () => {
            try {
              // Volvemos a comprobar que el canal existe y sigue vacío antes de borrar
              const channelToFetch = await guild.channels.fetch(oldChannel.id).catch(() => null);
              
              if (channelToFetch && channelToFetch.members.size === 0) {
                await channelToFetch.delete('Voice Manager: Canal temporal vacío tras tiempo de espera');
                logger.info(`[Voice Manager] Canal temporal "${oldChannel.name}" borrado.`);
                deleteQueue.delete(oldChannel.id);
              }
            } catch (err) {
              // Ignoramos errores si el canal ya fue borrado
            }
          }, delay);

          deleteQueue.set(oldChannel.id, timeout);
        }
      }

      // --- 3. LÓGICA DE CANCELACIÓN DE BORRADO ---
      // Si alguien entra a un canal que estaba en la lista de borrado, cancelamos el timer
      if (newChannel && deleteQueue.has(newChannel.id)) {
        logger.info(`[Voice Manager] Alguien entró en "${newChannel.name}". Borrado cancelado.`);
        clearTimeout(deleteQueue.get(newChannel.id));
        deleteQueue.delete(newChannel.id);
      }
    });
  },
});