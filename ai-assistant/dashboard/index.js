const { DashboardPlugin } = require("strange-sdk");

module.exports = new DashboardPlugin({
    icon: "fa-solid fa-robot",
    baseDir: __dirname,
    dashboardRouter: require("./settings.router"),
    adminRouter: require("./admin.router"),
    dbService: require("../db.service"),
});
