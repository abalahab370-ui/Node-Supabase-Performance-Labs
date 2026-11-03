const express = require("express");
const router = express.Router();

const registerHandler = require("../controllers/registHandler");
const loginHandler = require("../controllers/loginHander");
const googleOauth2Handler = require("../controllers/googleOauth2/Oauth2Handler");
const refreshToken = require("../controllers/refreshController");
const logoutHandler = require("../controllers/logoutHandler");

router.get("/google/config", (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID || null });
});

router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.post("/google", googleOauth2Handler);
router.post("/refresh", refreshToken);
router.post("/logout", logoutHandler);

module.exports = router;