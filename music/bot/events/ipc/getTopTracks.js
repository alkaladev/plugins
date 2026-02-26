const db = require("../../db.service");

module.exports = async ({ guildId }) => {
    const top = await db.getTopTracks(guildId, 5);
    return { top };
};
