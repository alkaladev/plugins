const { DashboardPlugin } = require("strange-sdk");

console.log("[TempChannels] Dashboard plugin cargando...");

try {
    const dashboardRouter = require("./router");
    const adminRouter = require("./admin.router");
    const dbService = require("../db.service");

    console.log("[TempChannels] Routers y dbService cargados");

    const plugin = new DashboardPlugin({
        icon: "fa-solid fa-microphone",
        baseDir: __dirname,
        dashboardRouter: (req, res, next) => {
            console.log("[TempChannels] dashboardRouter middleware llamado");
            dashboardRouter(req, res, next);
        },
        adminRouter: (req, res, next) => {
            console.log("[TempChannels] adminRouter middleware llamado");
            adminRouter(req, res, next);
        },
        dbService: dbService,
    });

    module.exports = plugin;
    console.log("[TempChannels] Dashboard plugin exportado exitosamente");
} catch (error) {
    console.error("[TempChannels] Error en dashboard plugin:", error);
    throw error;
}
