const { DashboardPlugin } = require("strange-sdk");
const express = require("express");
const dashboardRouter = require("./router");

module.exports = new DashboardPlugin({
    icon: "fa-solid fa-microphone",
    baseDir: __dirname,
    dbService: require("../db.service"),
    dashboardRouter: (req, res, next) => {
        // Middleware para extraer guildId y pasarlo a req.params
        const guildId = req.baseUrl.split('/')[2];
        req.params.guildId = guildId;
        console.log("[TempChannels] GuildId extraído:", guildId);
        
        // Llamar al router
        dashboardRouter(req, res, next);
    },
    onDashboardLoad: (app, client) => {
        // Pasar el cliente a la aplicación express
        app.set('client', client);
        console.log("[TempChannels] Cliente Discord vinculado al dashboard");
    }
});
