console.log("[TempChannels IPC] Cargando eventos IPC...");

module.exports = {
    "tempchannels:getSettings": (client, payload) => {
        console.log("[TempChannels IPC] getSettings llamado con payload:", payload);
        return require("./getSettings")(client, payload);
    },
    "tempchannels:addGenerator": (client, payload) => {
        console.log("[TempChannels IPC] addGenerator llamado");
        return require("./addGenerator")(client, payload);
    },
    "tempchannels:updateGenerator": (client, payload) => {
        console.log("[TempChannels IPC] updateGenerator llamado");
        return require("./updateGenerator")(client, payload);
    },
    "tempchannels:deleteGenerator": (client, payload) => {
        console.log("[TempChannels IPC] deleteGenerator llamado");
        return require("./deleteGenerator")(client, payload);
    },
    "tempchannels:getActiveChannels": (client, payload) => {
        console.log("[TempChannels IPC] getActiveChannels llamado");
        return require("./getActiveChannels")(client, payload);
    },
    "tempchannels:cleanupChannel": (client, payload) => {
        console.log("[TempChannels IPC] cleanupChannel llamado");
        return require("./cleanupChannel")(client, payload);
    },
};

console.log("[TempChannels IPC] Eventos IPC cargados");
