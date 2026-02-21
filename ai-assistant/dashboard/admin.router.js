const path = require("node:path");
const router = require("express").Router();

router.get("/", (_req, res) => {
    res.render(path.join(__dirname, "views/admin.ejs"));
});

router.put("/", async (req, res) => {
    const { config } = res.locals;
    const body = req.body;

    if (body.gemini_api_key !== undefined) {
        config["GEMINI_API_KEY"] = body.gemini_api_key;
    }

    await config.save();
    res.sendStatus(200);
});

module.exports = router;