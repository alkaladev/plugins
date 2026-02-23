// Cache compartido de usos de invitaciones: guildId -> Map<code, uses>
const inviteCache = new Map();
module.exports = { inviteCache };
