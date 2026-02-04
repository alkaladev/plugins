const { BotPlugin } = require('strange-sdk');

class ResponderPlugin extends BotPlugin {
    constructor() {
        super({
            name: 'reply' 
        });
    }

    async onReady() {
        console.log('¡Plugin Responder listo!');
    }

    async onMessage(message) {
        // Evitar que el bot se responda a sí mismo
        if (message.author.bot) return;

        if (message.content.toLowerCase() === '!hola') {
            await message.reply('¡Hola Jorge! El plugin de GitHub está funcionando correctamente. 🚀');
        }
    }
}

module.exports = new ResponderPlugin();