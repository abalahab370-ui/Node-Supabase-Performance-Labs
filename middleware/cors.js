const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || "http://localhost:5501,http://127.0.0.1:5501,http://localhost:5000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const cors = (req, res, next) => {
  const origin = req.get("origin");
  const isAllowedOrigin = origin && allowedOrigins.has(origin);

  if (isAllowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true"); // Crucial if sending credentials/cookies
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(isAllowedOrigin ? 204 : 403);
  }

  return next();
};

module.exports = cors;