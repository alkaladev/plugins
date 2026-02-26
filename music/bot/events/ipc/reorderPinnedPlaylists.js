const db = require("../../db.service");

module.exports = async ({ guildId, orderedIds }) => {
    await db.reorderPinnedPlaylists(guildId, orderedIds);
    return { ok: true };
};
