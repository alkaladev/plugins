const db = require("../../db.service");

module.exports = async ({ guildId, data }) => {
    const playlist = await db.upsertPinnedPlaylist(guildId, data);
    return { playlist };
};
