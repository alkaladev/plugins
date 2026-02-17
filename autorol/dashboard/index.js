const { DashboardPlugin } = require("strange-sdk");
const dashboardRouter = require("./router");

module.exports = new DashboardPlugin({
    icon: "fa-solid fa-crown",
    baseDir: __dirname,
    dashboardRouter: dashboardRouter,
    dbService: require("../db.service"),
    onDashboardLoad: (app, client) => {
        // Pasar el cliente a la aplicación express
        app.set('client', client);
        console.log("[Autorol] Cliente Discord vinculado al dashboard");
    }
});
