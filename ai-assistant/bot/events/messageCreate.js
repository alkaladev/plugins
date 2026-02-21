const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (client, message) => {
    // El SDK de strange pasa (client, ...eventArgs)
    // Si message es undefined, puede que el SDK pase solo (message) sin client
    const msg = message ?? client;
    const discordClient = message ? client : null;

    if (!msg || msg.author?.bot || !msg.guild) return;

    // Acceder al db de forma lazy para asegurarnos que ya está inicializado
    let db;
    try {
        db = require("../../db.service");
    } catch {
        return;
    }

    let globalConfig, settings;
    try {
        [globalConfig, settings] = await Promise.all([
            db.getGlobalConfig(),
            db.getSettings(msg.guild.id),
        ]);
    } catch {
        return;
    }

    if (!globalConfig?.api_key) return;
    if (!settings?.enabled) return;

    const botUser = discordClient?.user ?? msg.client?.user;
    const isMentioned = botUser && msg.mentions.has(botUser);
    const isAiChannel = settings.ai_channel && settings.ai_channel === msg.channel.id;

    if (!isMentioned && !isAiChannel) return;

    try {
        await msg.channel.sendTyping();

        const genAI = new GoogleGenerativeAI(globalConfig.api_key);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: "Eres un asistente de Discord. Responde de forma concisa y útil.",
        });

        const prompt = msg.content.replace(/<@(!?)\d+>/g, "").trim();
        if (!prompt) return;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        if (text.length > 2000) {
            const chunks = text.match(/[\s\S]{1,1900}/g);
            for (const chunk of chunks) await msg.reply(chunk);
        } else {
            await msg.reply(text);
        }
    } catch (error) {
        console.error("Error en Gemini:", error);
    }
};
