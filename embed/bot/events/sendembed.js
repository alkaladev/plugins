/**
 * @type {import('strange-sdk').EventContext}
 */
module.exports = {
  // Cambiamos el nombre a 'ready'. 
  // Esto evita el error "Invalid event" porque 'ready' sí es un evento válido de Discord.
  name: "ready", 

  // Esta función se ejecutará una sola vez cuando el bot conecte
  execute: async (client) => {
    console.log("[IPC] 🚀 Registrando puente de comunicación para la Dashboard...");

    // Registramos el listener del cluster manualmente aquí dentro
    client.cluster.on("dashboard:sendembed", async (data) => {
      console.log(`[IPC] 📥 Petición de canales recibida para Guild: ${data.guildId}`);
      
      try {
        const guild = client.guilds.cache.get(data.guildId);
        
        if (!guild) {
          return { success: false, data: [], error: "Guild no encontrada en el caché" };
        }

        const channels = guild.channels.cache
          .filter((c) => c.type === 0) // Canal de texto
          .map((c) => ({
            id: c.id,
            name: c.name,
          }));

        console.log(`[IPC] ✅ Enviando ${channels.length} canales a la Web.`);
        return { success: true, data: channels };
        
      } catch (err) {
        console.error("[IPC] ❌ Error procesando canales:", err);
        return { success: false, data: [], error: err.message };
      }
    });
  },
};