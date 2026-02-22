const { DashboardPlugin } = require("strange-sdk");
const path = require("path");

module.exports = new DashboardPlugin({
    id: "music",
    icon: "fa-solid fa-music",
    baseDir: __dirname,
    dashboardRouter: require("./router"),
    viewsPath: __dirname, // Indica que view.ejs está en esta carpeta
    tabs: [
        {
            id: "player",
            icon: "fa-solid fa-play",
            view: "view" // Este debe ser el nombre del archivo sin extensión (view.ejs)
        }
    ]
});