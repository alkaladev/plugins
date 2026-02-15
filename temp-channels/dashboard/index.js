const { DashboardPlugin } = require("strange-sdk");

const dashboardRouter = require("./router");

module.exports = new DashboardPlugin({
    icon: "fa-solid fa-microphone",
    baseDir: __dirname,
    dashboardRouter: dashboardRouter,
    dbService: require("../db.service"),
});
