const googleClient = require("../../config/Oauth2Connection");
const jwt = require("jsonwebtoken");
const { query } = require("../../config/dbConnection");
const uuid = require("uuid").v4;
const cookieOptions = require("../../config/authCookieOptions");

const Oauth2Handler = async (req, res) => {
  try {
    const { token } = req.body || {};

    if (!token) {
      return res.status(400).json({
        message: "Google ID token is required."
      });
    }

    let payload;

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      payload = ticket.getPayload();
    } catch (error) {
      console.error("Google token verification failed:", error.message);

      return res.status(401).json({
        error: "Invalid or expired Google ID token."
      });
    }

    if (!payload?.email || !payload.email_verified) {
      return res.status(403).json({
        error: "A verified Google email address is required."
      });
    }

    // Lookup strictly by Google ID
    let result = await query(
      `SELECT id, full_name, email, avatar, role
       FROM "user"
       WHERE "googleId" = $1`,
      [payload.sub]
    );

    let user = result.rows[0];

    if (!user) {
      const id = uuid();
      
      // Fallback base name if display name is missing
      const baseName = payload.name || payload.email.split("@")[0];

      result = await query(
        `INSERT INTO "user" (id, full_name, email, "googleId", avatar)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, full_name, email, avatar, role`,
        [
          id,
          baseName,
          payload.email,
          payload.sub,
          payload.picture || null
        ]
      );
      user = result.rows[0];
    }

    const userInfo = {
      userId: user.id,
      email: user.email,
      name: user.full_name,
      avatar: user.avatar,
      role: user.role
    };

    const accessToken = jwt.sign(
      { userInfo },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "2h" }
    );
    
    const refreshToken = jwt.sign(
      { userInfo },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "6h" }
    );

    res.cookie("jwt", refreshToken, cookieOptions);
    return res.status(200).json({ accessToken });

  } catch (err) {
    console.error("Google OAuth handler failed:", err);
    return res.status(500).json({
      message: "Unable to complete Google sign-in."
    });
  }
};

module.exports = Oauth2Handler;