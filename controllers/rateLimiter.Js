const client = require("../config/rdConnection");

const RATE_LIMIT = 10;
const WINDOW_SECONDS = 10;
const INCREMENT_AND_EXPIRE = `
  local requests = redis.call("INCR", KEYS[1])
  if requests == 1 or redis.call("TTL", KEYS[1]) == -1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
  end
  return requests
`;

const rateLimiter = async (req, res, next) => {
  try {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const key = `rate-limit:${ip}`;
    const requests = await client.eval(INCREMENT_AND_EXPIRE, {
      keys: [key],
      arguments: [String(WINDOW_SECONDS)]
    });

    if (requests > RATE_LIMIT) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please wait a few seconds and try again."
      });
    }

    return next();
  } catch (err) {
    console.error(`RateLimit Middleware Error: ${err}`);
    return next();
  }
};

module.exports = rateLimiter;