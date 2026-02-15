const { DashboardPlugin } = require("strange-sdk");

module.exports = new DashboardPlugin({
    name: "voice-manager",
    icon: "fa-solid fa-microphone-lines",
    baseDir: __dirname,
    handler: require("./router.js"), // Verifica que el archivo se llame router.js
});