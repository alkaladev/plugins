const db = require("../../db.service");

module.exports = async ({ guildId, id }) => {
    await db.deletePinnedArtist(guildId, id);
    return { ok: true };
};
