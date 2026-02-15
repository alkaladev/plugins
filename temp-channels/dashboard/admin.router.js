const router = require("express").Router();
const dbService = require("../db.service");

// GET - Obtener configuración global del plugin
router.get("/settings", async (req, res) => {
    try {
        res.json({ success: true, data: { enabled: true } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST - Habilitar plugin globalmente
router.post("/enable", async (req, res) => {
    try {
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST - Deshabilitar plugin globalmente
router.post("/disable", async (req, res) => {
    try {
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
