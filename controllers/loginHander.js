const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { query } = require("../config/dbConnection");
const cookieOptions = require("../config/authCookieOptions");

const loginHandler = async (req, res) => {
  try {
    const { full_name, password } = req.body || {};

    // 1. Input Validation
    if (!full_name || !password) {
      return res.status(400).json({
        message: "Full name and password are required."
      });
    }

    // 2. Fetch User by full_name
    const result = await query(
      `SELECT id, full_name, email, password, avatar, role
       FROM "user"
       WHERE full_name = $1`,
      [full_name]
    );

    const user = result.rows[0];

    // Check if user exists or if they registered strictly via Google (no password set)
    if (!user || !user.password) {
      return res.status(401).json({
        message: "Invalid credentials."
      });
    }

    // 3. Verify Password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        message: "Invalid credentials."
      });
    }

    // 4. Update last_seen timestamp
    await query(
      `UPDATE "user" SET last_seen = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.id]
    );

    // 5. Build JWT Payload and Issue Tokens
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

    // Set Refresh Token in Cookie and return Access Token
    res.cookie("jwt", refreshToken, cookieOptions);
    return res.status(200).json({ accessToken });

  } catch (err) {
    console.error("Login handler failed:", err);
    return res.status(500).json({
      message: "Unable to complete login."
    });
  }
};

module.exports = loginHandler;