module.exports = async (client, payload) => {
    const dbService = require("../../db.service");
    const { guildId, sourceChannelId, updates } = payload;
    return await dbService.updateGenerator(guildId, sourceChannelId, updates);
};
