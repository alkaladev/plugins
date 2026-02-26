const db = require("../../db.service");

module.exports = async ({ guildId }) => {
    const artists = await db.getPinnedArtists(guildId);
    return { artists };
};
