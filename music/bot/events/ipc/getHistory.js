const db = require("../../db.service");

module.exports = async ({ guildId }) => {
    const history = await db.getHistory(guildId, 20);
    return { history };
};
