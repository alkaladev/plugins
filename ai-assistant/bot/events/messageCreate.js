const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require("../../db.service");

/**
 * @param {import("discord.js").Message} message
 */
module.exports = async (message) => {
    if (message.author.bot || !message.guild) return;

    const [globalConfig, settings] = await Promise.all([
        db.getGlobalConfig(),
        db.getSettings(message.guild.id),
    ]);

    if (!globalConfig?.api_key) return;
    if (!settings?.enabled) return;

    const isMentioned = message.mentions.has(message.client.user);
    const isAiChannel = settings.ai_channel && settings.ai_channel === message.channel.id;

    if (!isMentioned && !isAiChannel) return;

    try {
        await message.channel.sendTyping();

        const genAI = new GoogleGenerativeAI(globalConfig.api_key);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: "Eres un asistente de Discord. Responde de forma concisa y útil.",
        });

        const prompt = message.content.replace(/<@(!?)\d+>/g, "").trim();
        if (!prompt) return;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        if (text.length > 2000) {
            const chunks = text.match(/[\s\S]{1,1900}/g);
            for (const chunk of chunks) await message.reply(chunk);
        } else {
            await message.reply(text);
        }
    } catch (error) {
        // Cuota excedida (429)
        if (error?.status === 429) {
            await message.reply("⚠️ La IA ha alcanzado el límite de solicitudes. Por favor, espera unos minutos e inténtalo de nuevo.").catch(() => {});
            return;
        }
        // API key inválida (400/403)
        if (error?.status === 400 || error?.status === 403) {
            await message.reply("❌ La API Key de Gemini no es válida. Contacta a un administrador del servidor.").catch(() => {});
            return;
        }
        console.error("Error en Gemini:", error);
    }
};
