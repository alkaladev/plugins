const db = require("../../db.service");

/**
 * @param {import("discord.js").Message} message
 */
module.exports = async (message) => {
    if (!message?.author || message.author.bot || !message.guild) return;

    const [globalConfig, settings] = await Promise.all([
        db.getGlobalConfig(),
        db.getSettings(message.guild.id),
    ]);

    const apiKey = globalConfig?.api_key;
    if (!apiKey || !settings?.enabled) return;

    const isMentioned = message.mentions.has(message.client.user);
    const isAiChannel = settings.ai_channel && settings.ai_channel === message.channel.id;
    if (!isMentioned && !isAiChannel) return;

    try {
        await message.channel.sendTyping();

        // Detectar qué versión del SDK está disponible y usarla correctamente
        const geminiSDK = require("@google/generative-ai");
        let model;

        if (geminiSDK.GoogleGenAI) {
            // SDK >= 0.24.x — nueva API
            const { GoogleGenAI } = geminiSDK;
            const ai = new GoogleGenAI({ apiKey });
            model = ai.models; // usamos ai.models.generateContent directamente
            
            const prompt = message.content.replace(new RegExp(`<@!?${message.client.user.id}>`, "g"), "").trim();
            if (!prompt && isMentioned) return message.reply("¿En qué puedo ayudarte?").catch(() => {});
            if (!prompt) return;

            const result = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt,
                config: {
                    systemInstruction: "Eres un asistente de Discord. Responde de forma concisa y útil.",
                },
            });

            const text = result.text;
            return sendReply(message, text);

        } else {
            // SDK <= 0.21.x — API antigua
            const { GoogleGenerativeAI } = geminiSDK;
            const genAI = new GoogleGenerativeAI(apiKey);
            const mdl = genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
                systemInstruction: "Eres un asistente de Discord. Responde de forma concisa y útil.",
            });

            const prompt = message.content.replace(new RegExp(`<@!?${message.client.user.id}>`, "g"), "").trim();
            if (!prompt && isMentioned) return message.reply("¿En qué puedo ayudarte?").catch(() => {});
            if (!prompt) return;

            const result = await mdl.generateContent(prompt);
            const text = result.response.text();
            return sendReply(message, text);
        }

    } catch (error) {
        const status = error?.status ?? error?.response?.status;

        if (status === 429) {
            return message.reply("⚠️ He alcanzado el límite de solicitudes. Inténtalo en unos minutos.").catch(() => {});
        }
        if (status === 400 || status === 403) {
            return message.reply("❌ La API Key de Gemini no es válida. Contacta a un administrador.").catch(() => {});
        }
        console.error("Error en Gemini:", error);
    }
};

async function sendReply(message, text) {
    if (!text) return;
    if (text.length > 2000) {
        const chunks = text.match(/[\s\S]{1,1900}/g);
        for (const chunk of chunks) await message.reply(chunk);
    } else {
        await message.reply(text);
    }
}
