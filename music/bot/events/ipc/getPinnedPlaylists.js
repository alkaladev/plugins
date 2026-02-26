const db = require("../../db.service");

module.exports = async ({ guildId }) => {
    const playlists = await db.getPinnedPlaylists(guildId);
    return { playlists };
};
