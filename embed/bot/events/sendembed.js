module.exports = {
  name: "sendembed-ipc",
  execute: async (client) => {
    console.log("[IPC] 🚀 Evento sendembed-ipc cargado y escuchando...");

    client.cluster.on("dashboard:sendembed", async (data) => {
      console.log(`[IPC] 📥 Petición recibida para la Guild: ${data.guildId}`);
      
      try {
        const guild = client.guilds.cache.get(data.guildId);
        
        if (!guild) {
          console.error(`[IPC] ❌ Error: No se encontró la Guild ${data.guildId} en el cache del bot.`);
          return { success: false, data: [], error: "Guild not found" };
        }

        const channels = guild.channels.cache
          .filter((c) => c.type === 0)
          .map((c) => ({ id: c.id, name: c.name }));

        console.log(`[IPC] ✅ Enviando ${channels.length} canales a la Dashboard.`);
        return { success: true, data: channels };
      } catch (err) {
        console.error(`[IPC] 💥 Error crítico en el evento:`, err);
        return { success: false, data: [], error: err.message };
      }
    });
  },
};