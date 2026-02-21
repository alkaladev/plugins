const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (client, message) => {
    if (message.author.bot || !message.guild) return;
    if (!client.aiDb) return;

    // Leer config y settings desde el client (inicializado en onEnable)
    const [globalConfig, settings] = await Promise.all([
        client.aiDb.getGlobalConfig(),
        client.aiDb.getSettings(message.guild.id),
    ]);

    if (!globalConfig?.api_key) return;
    if (!settings?.enabled) return;

    const isMentioned = message.mentions.has(client.user);
    const isAiChannel = settings.ai_channel && settings.ai_channel === message.channel.id;

    if (!isMentioned && !isAiChannel) return;

    try {
        await message.channel.sendTyping();

        const genAI = new GoogleGenerativeAI(globalConfig.api_key);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: "Eres un asistente de Discord. Responde de forma concisa y útil.",
        });

        const prompt = message.content.replace(/<@(!?)\d+>/g, "").trim();
        if (!prompt) return;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        if (text.length > 2000) {
            const chunks = text.match(/[\s\S]{1,1900}/g);
            for (const chunk of chunks) {
                await message.reply(chunk);
            }
        } else {
            await message.reply(text);
        }
    } catch (error) {
        console.error("Error en Gemini Event:", error);
    }
};
