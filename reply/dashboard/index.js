const { DashboardPlugin } = require("strange-sdk");

module.exports = new DashboardPlugin({
    icon: "fa-solid fa-reply",
    dependencies: [],
    baseDir: __dirname,
    dashboardRouter: require("./router"),
});