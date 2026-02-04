const { BotPlugin } = require("strange-sdk");

module.exports = new BotPlugin({
    ownerOnly: false,
    baseDir: __dirname, // Ya no necesitamos path.join porque estamos en la raíz
});