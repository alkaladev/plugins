const path = require("node:path");
const router = require("express").Router();
const db = require("../db.service");

router.get("/", async (_req, res) => {
    const globalConfig = await db.getGlobalConfig();
    res.render(path.join(__dirname, "views/admin.ejs"), { globalConfig });
});

router.put("/", async (req, res) => {
    const body = req.body;
    const globalConfig = await db.getGlobalConfig();

    if (body.api_key !== undefined) {
        globalConfig.api_key = body.api_key;
    }

    await globalConfig.save();
    res.sendStatus(200);
});

module.exports = router;
