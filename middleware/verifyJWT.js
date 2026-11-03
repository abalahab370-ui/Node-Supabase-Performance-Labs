const jwt = require("jsonwebtoken");

const verifyJWT = (req, res, next) => {
  try {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      return res.status(500).json({ message: "JWT secret is not configured." });
    }

    const authHeader = req.headers.authorization || req.headers.Authorization;
    const tokenMatch = typeof authHeader === "string"
      ? authHeader.match(/^Bearer\s+(\S+)$/i)
      : null;
    if (!tokenMatch) {
      return res.status(401).json({ message: "Authentication token is required." });
    }

    const decoded = jwt.verify(tokenMatch[1], secret, {
      algorithms: ["HS256"]
    });
    if (!decoded || typeof decoded !== "object") {
      return res.status(401).json({ message: "Token is expired or invalid." });
    }

    const userInfo = decoded.userInfo || decoded.UserInfo || decoded;
    if (!userInfo || typeof userInfo !== "object" || Array.isArray(userInfo)) {
      return res.status(401).json({ message: "Token is expired or invalid." });
    }

    req.user = userInfo;
    req.userInfo = userInfo;
    req.roles = Array.isArray(userInfo.roles)
      ? userInfo.roles
      : Object.values(userInfo.roles || {});

    return next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token is expired or invalid." });
    }

    console.error(`verifyJWT error: ${err}`);
    return res.status(500).json({ message: "Server error while verifying token" });
  }
};

module.exports = verifyJWT;