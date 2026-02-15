const { DashboardPlugin } = require("strange-sdk");
const path = require("path");

module.exports = new DashboardPlugin({
    name: "Voice Manager",
    icon: "fa-solid fa-microphone-lines",
    dependencies: [],
    baseDir: __dirname,
    dashboardRouter: require("./router"), // Asegúrate de que router.js exista al lado
});