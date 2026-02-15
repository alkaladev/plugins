const { DashboardPlugin } = require("strange-sdk");

console.log("[TempChannels] Dashboard plugin cargando...");

const dashboardRouter = require("./router");
const adminRouter = require("./admin.router");
const dbService = require("../db.service");

module.exports = new DashboardPlugin({
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

console.log("[TempChannels] Dashboard plugin exportado");
