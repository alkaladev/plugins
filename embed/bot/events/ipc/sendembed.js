/**
 * @type {import('strange-sdk').EventContext}
 */
module.exports = {
  name: "sendembed-ipc", // Este es el nombre del evento para el cargador de Strange
  execute: async (client) => {
    
    // IMPORTANTE: Este nombre "dashboard:sendembed" debe ser igual al del router
    client.cluster.on("dashboard:sendembed", async (data) => {
      const { guildId } = data;
      const guild = client.guilds.cache.get(guildId);
      
      if (!guild) {
        return { success: false, data: [], error: "Guild not found" };
      }

      // Filtramos los canales de texto para enviarlos a la dashboard
      const channels = guild.channels.cache
        .filter((c) => c.type === 0) // 0 = GuildText (Canal de texto)
        .map((c) => ({
          id: c.id,
          name: c.name,
        }));

      return { success: true, data: channels };
    });
  },
};