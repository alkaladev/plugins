const { BotPlugin } = require('strange-sdk');

class ResponderPlugin extends BotPlugin {
    constructor() {
        super({
            name: 'reply',
            baseDir: __dirname //
        });
    }

    async onReady() {
        this.client.logger.info('Plugin Responder habilitado y listo.');
    }

    async onMessage(message) {
        if (message.author.bot) return;
        
        if (message.content.toLowerCase() === '!hola') {
            await message.reply('¡Hola Jorge! El plugin ya reconoce la ruta correctamente. 🚀');
        }
    }
}

module.exports = new ResponderPlugin();