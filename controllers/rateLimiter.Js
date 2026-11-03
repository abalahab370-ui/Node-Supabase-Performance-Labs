const client = require("../../config/rdConnection") ;
const express = require("express") ;


const rateLimiter = async (req, res, next) => {
  try {
    // Handle IP detection (including behind proxies like Render)
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const key = `address:${ip}`;

    // Atomically increment request count
    const requests = await client.incr(key);

    // FIX: When a key is created for the first time, INCR returns 1
    if (requests === 1) {
      await client.expire(key, 10); // Set a 10-second window TTL
    }

    // Allow up to 10 requests per 10-second window
    if (requests <= 10) {
      return next();
    }

    // Rate limit exceeded
    return res.status(429).json({
      error: 'Too many requests. Please wait a few seconds and try again.'
    });

  } catch (err) {
    console.error(`RateLimit Middleware Error: ${err}`);
    // Fail-open: If Redis fails, allow request through rather than breaking the app
    next();
  }
};

module.exports = rateLimiter ;