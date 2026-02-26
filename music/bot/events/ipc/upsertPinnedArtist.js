const db = require("../../db.service");

module.exports = async ({ guildId, data }) => {
    const artist = await db.upsertPinnedArtist(guildId, data);
    return { artist };
};
