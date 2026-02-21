const { BotPlugin } = require("strange-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = new BotPlugin({
    baseDir: __dirname,

    // Se ejecuta cuando el plugin se activa
    onEnable: (client) => {
        console.log("[Gemini-AI] Plugin habilitado correctamente.");
        
        // Podemos guardar la instancia de la IA en el cliente 
        // o en una variable global del módulo para usarla en los eventos.
        const apiKey = client.config?.plugins?.["gemini-ai"]?.api_key; 
        
        if (!apiKey) {
            console.error("[Gemini-AI] Falta la API_KEY en la configuración.");
        }
    },

    // Si usas base de datos para guardar historiales de chat
    dbService: require("../db.service"), 
});