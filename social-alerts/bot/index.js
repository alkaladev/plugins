const { runChecks } = require("./checker");

module.exports = (client) => {
    client.once("ready", () => {
        console.log("[social-alerts] Bot listo, iniciando checks...");

        // Check inicial al arrancar
        setTimeout(() => runChecks(client), 10000);

        // Check cada 5 minutos
        setInterval(() => runChecks(client), 5 * 60 * 1000);
    });
};
