const router = require("express").Router();
const dbService = require("../db.service");

// GET - Obtener configuración global del plugin
router.get("/settings", async (req, res) => {
    try {
        console.log("[TempChannels] Admin GET /settings");
        res.json({ success: true, data: { enabled: true } });
    } catch (error) {
        console.error("[TempChannels] Admin GET /settings error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST - Habilitar plugin globalmente
router.post("/enable", async (req, res) => {
    try {
        console.log("[TempChannels] Admin POST /enable - Request recibido");
        res.json({ success: true });
    } catch (error) {
        console.error("[TempChannels] Admin POST /enable error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST - Deshabilitar plugin globalmente
router.post("/disable", async (req, res) => {
    try {
        console.log("[TempChannels] Admin POST /disable - Request recibido");
        res.json({ success: true });
    } catch (error) {
        console.error("[TempChannels] Admin POST /disable error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
