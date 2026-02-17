module.exports = {
    "tempchannels:getSettings": (client, payload) => {
        return require("./getSettings")(client, payload);
    },
    "tempchannels:addGenerator": (client, payload) => {
        return require("./addGenerator")(client, payload);
    },
    "tempchannels:updateGenerator": (client, payload) => {
        return require("./updateGenerator")(client, payload);
    },
    "tempchannels:deleteGenerator": (client, payload) => {
        return require("./deleteGenerator")(client, payload);
    },
    "tempchannels:getActiveChannels": (client, payload) => {
        return require("./getActiveChannels")(client, payload);
    },
    "tempchannels:cleanupChannel": (client, payload) => {
        return require("./cleanupChannel")(client, payload);
    },
};
