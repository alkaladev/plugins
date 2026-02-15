module.exports = async (client, payload) => {
    const dbService = require("../../db.service");
    const { guildId, generator } = payload;
    return await dbService.addGenerator(guildId, generator);
};
