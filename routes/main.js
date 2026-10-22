const express = require("express");
const router = express.Router();

const registerHandler = require("../controllers/registHandler");
const loginHandler = require("../controllers/loginHander");
const googleOauth2Handler = require("../controllers/googleOauth2/Oauth2Handler");
const refreshToken = require("../controllers/refreshController");
const logoutHandler = require("../controllers/logoutHandler");

router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.post("/google", googleOauth2Handler);
router.post("/refresh", refreshToken);
router.post("/logout", logoutHandler);

module.exports = router;