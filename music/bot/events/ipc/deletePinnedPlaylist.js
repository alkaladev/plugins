const db = require("../../db.service");

module.exports = async ({ guildId, id }) => {
    await db.deletePinnedPlaylist(guildId, id);
    return { ok: true };
};
