/**
 * @type {import('strange-sdk').EventContext}
 */
module.exports = {
  name: "embed-ipc", // Identificador interno
  execute: async (client) => {
    
    // Escuchar la petición de canales desde el Dashboard
    // Se activa cuando el router hace: req.broadcastOne("dashboard:GET_EMBED_CHANNELS", ...)
    client.cluster.on("dashboard:GET_EMBED_CHANNELS", async (data) => {
      const { guildId } = data;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return { success: false, data: [] };

      // Obtenemos solo los canales de texto
      const channels = guild.channels.cache
        .filter((c) => c.type === 0) // 0 = GuildText
        .map((c) => ({
          id: c.id,
          name: c.name,
        }));

      return { success: true, data: channels };
    });

    // Escuchar la petición para ENVIAR el embed diseñado
    client.cluster.on("dashboard:SEND_EMBED_MESSAGE", async (data) => {
      const { guildId, channelId, embedData } = data;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return { success: false, error: "Servidor no encontrado" };

      const channel = guild.channels.cache.get(channelId);
      if (!channel) return { success: false, error: "Canal no encontrado" };

      try {
        // El objeto embedData debe tener el formato de Discord (el que definimos en el DBService)
        await channel.send({
          embeds: [embedData]
        });
        return { success: true };
      } catch (err) {
        console.error("Error enviando embed desde Dashboard:", err);
        return { success: false, error: err.message };
      }
    });
  },
};