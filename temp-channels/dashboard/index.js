const { DashboardPlugin } = require("strange-sdk");
const dashboardRouter = require("./router");

module.exports = new DashboardPlugin({
    icon: "fa-solid fa-microphone",
    desription: "Crea embeds con botones para que los usuarios obtengan roles automáticamente",
    baseDir: __dirname,
    dashboardRouter: dashboardRouter,
    dbService: require("../db.service"),
    onDashboardLoad: (app, client) => {
        // Pasar el cliente a la aplicación express
        app.set('client', client);
        console.log("[TempChannels] Cliente Discord vinculado al dashboard");
    }
});
