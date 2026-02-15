module.exports = async (client, payload) => {
    const dbService = require("../../db.service");
    const { guildId } = payload;
    return await dbService.getSettings(guildId);
};
