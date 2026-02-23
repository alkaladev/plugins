const { BotPlugin } = require("strange-sdk");
const db = require("../db.service");

module.exports = new BotPlugin({
    baseDir:      __dirname,
    dependencies: [],
    dbService:    db,
});
