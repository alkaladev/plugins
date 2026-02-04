const { BotPlugin } = require('strange-sdk');

class ResponderPlugin extends BotPlugin {
    constructor() {
        super({
            name: 'reply'
        });
    }

    async onReady() {
        this.client.logger.info('Plugin Responder cargado correctamente.');
    }

    async onMessage(message) {
        if (message.author.bot) return;
        if (message.content.toLowerCase() === '!hola') {
            await message.reply('¡Hola Jorge! Todo funciona. 🚀');
        }
    }
}

module.exports = new ResponderPlugin();