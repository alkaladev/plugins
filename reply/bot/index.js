const { BotPlugin } = require("strange-sdk");

module.exports = new BotPlugin({
    dependencies: [],
    baseDir: __dirname,
    localesDir: path.join(__dirname, '..', 'locales')
});