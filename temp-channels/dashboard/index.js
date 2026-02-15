const { DashboardPlugin } = require("strange-sdk");

console.log("[TempChannels] Dashboard plugin cargando...");

module.exports = new DashboardPlugin({
    icon: "fa-solid fa-microphone",
    baseDir: __dirname,
    dashboardRouter: require("./router"),
    adminRouter: require("./admin.router"),
    dbService: require("../db.service"),
});

console.log("[TempChannels] Dashboard plugin exportado");
