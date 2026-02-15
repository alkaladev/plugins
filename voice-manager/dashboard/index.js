const { DashboardPlugin } = require("strange-sdk");
// Eliminamos path de aquí si no se usa para evitar que salga "apagado"

module.exports = new DashboardPlugin({
    name: "voice-manager", // Nombre en minúsculas para la URL
    icon: "fa-solid fa-microphone-lines",
    dependencies: [],
    baseDir: __dirname,
    handler: require("./router"), // Cambiado de dashboardRouter a handler
});