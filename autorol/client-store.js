/**
 * Módulo singleton para compartir el cliente de Discord
 * entre el bot plugin y el dashboard router dentro del mismo proceso.
 */

let _client = null;

module.exports = {
    set(client) {
        _client = client;
        console.log("[Autorol] Cliente Discord guardado en client-store");
    },
    get() {
        return _client;
    }
};
