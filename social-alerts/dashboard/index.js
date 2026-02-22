const path = require("node:path");

module.exports = {
    id:          "social-alerts",
    name:        "Alertas Sociales",
    icon:        "fa-solid fa-bell",
    description: "Notificaciones de Twitch, YouTube, Twitter e Instagram",
    color:       "#8B5CF6",
    router:      require("./settings.router"),
    adminRouter: require("./admin.router"),
    viewsDir:    path.join(__dirname, "views"),
    localesDir:  path.join(__dirname, "locales"),
};
