// Verify access token sent by the frontend
const jwt = require("jsonwebtoken");

const verifyJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication token is required." });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Token is expired or invalid" });
      }

      req.userInfo = decoded?.userInfo || decoded;

      req.roles = Array.isArray(req.userInfo?.roles)
        ? req.userInfo.roles
        : Object.values(req.userInfo?.roles || {});

      next();
    });
  } catch (err) {
    console.log(`Sir we have a problem In verifyJWT : ${err}`);
    return res.status(500).json({ message: "Server error while verifying token" });
  }
};

module.exports = verifyJWT;