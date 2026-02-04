/**
 * @type {import('strange-sdk').EventContext}
 */
module.exports = {
  name: "sendembed_ipc_handler", // Un nombre interno para el cargador
  // NO uses 'execute' aquí si quieres evitar el error de evento inválido
  
  // Usamos esta forma para registrar los eventos del Cluster manualmente
  execute: async (client) => {
    console.log("[IPC] 🚀 Registrando listener manual para dashboard:sendembed");

    client.cluster.on("dashboard:sendembed", async (data) => {
      console.log(`[IPC] 📥 Petición de canales para: ${data.guildId}`);
      
      const guild = client.guilds.cache.get(data.guildId);
      if (!guild) return { success: false, data: [] };

      const channels = guild.channels.cache
        .filter((c) => c.type === 0)
        .map((c) => ({ id: c.id, name: c.name }));

      return { success: true, data: channels };
    });
  },
};