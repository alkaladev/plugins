module.exports = async (client, payload) => {
    const dbService = require("../../db.service");
    const { guildId, sourceChannelId } = payload;
    return await dbService.deleteGenerator(guildId, sourceChannelId);
};
