const { BotPlugin } = require('strange-sdk');

class ResponderPlugin extends BotPlugin {
    constructor() {
        super('responder');
    }

    async onReady() {
        console.log('¡Plugin Responder listo para contestar!');
    }

    async onMessage(message) {
        // Si el mensaje es "!hola", el bot responde
        if (message.content.toLowerCase() === '!hola') {
            await message.reply('¡Hola Jorge! El plugin de GitHub está funcionando correctamente. 🚀');
        }
    }
}

module.exports = new ResponderPlugin();