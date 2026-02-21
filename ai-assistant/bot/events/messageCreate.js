const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (client, message) => {
    // 1. Filtros básicos
    if (message.author.bot || !message.guild) return;

    // 2. Obtener config del plugin (esto depende de cómo strange-sdk inyecte la config)
    // Asumamos que está disponible en client.plugins.config o similar
    const config = client.getConfig?.("gemini-ai") || {}; 
    
    if (!config.api_key) return;

    // 3. Verificar si el bot fue mencionado o si es el canal de IA
    const isMentioned = message.mentions.has(client.user);
    const isAiChannel = config.channel_id === message.channel.id;

    if (!isMentioned && !isAiChannel) return;

    try {
        await message.channel.sendTyping();

        // 4. Inicializar Gemini (Podrías optimizar esto moviéndolo fuera del evento)
        const genAI = new GoogleGenerativeAI(config.api_key);
        const model = genAI.getGenerativeModel({ 
            model: config.model || "gemini-2.0-flash",
            systemInstruction: config.system_instruction || "Eres un asistente de Discord."
        });

        // Limpiar el texto del prompt
        const prompt = message.content.replace(/<@(!?)\d+>/g, "").trim();
        if (!prompt) return;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // 5. Responder respetando el límite de Discord
        if (text.length > 2000) {
            const chunks = text.match(/[\s\S]{1,1900}/g); // Cortar en trozos de 1900
            for (const chunk of chunks) {
                await message.reply(chunk);
            }
        } else {
            await message.reply(text);
        }

    } catch (error) {
        console.error("Error en Gemini Event:", error);
        // Evitar spam de errores si la API Key es inválida
    }
};