const { DashboardPlugin } = require("strange-sdk");

module.exports = new DashboardPlugin({
    icon:            "fa-solid fa-scroll",
    baseDir:         __dirname,
    dashboardRouter: require("./dashboard/settings.router"),
    dbService:       require("./db.service"),
});
