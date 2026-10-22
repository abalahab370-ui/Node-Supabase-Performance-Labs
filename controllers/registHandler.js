const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const query = require("../config/dbConnection");
const uuid = require("uuid").v4;
const cookieOptions = require("../config/authCookieOptions");

const registerHandler = async (req, res) => {
  try {
    const { full_name, password } = req.body || {};

    // 1. Input Validation
    if (!full_name || !password) {
      return res.status(400).json({
        message: "Full name and password are required."
      });
    }

    // 2. Hash Password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const id = uuid();

    // 3. Insert User into PostgreSQL (email stays NULL)
    const result = await query(
      `INSERT INTO "user" (id, full_name, password)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, email, avatar, role`,
      [id, full_name, hashedPassword]
    );

    const user = result.rows[0];

    // 4. Build JWT Payload and Issue Tokens
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

    // Set Refresh Token Cookie & Return Access Token
    res.cookie("jwt", refreshToken, cookieOptions);
    return res.status(201).json({ accessToken });

  } catch (err) {
    console.error("Register handler failed:", err);
    return res.status(500).json({
      message: "Unable to complete registration."
    });
  }
};

module.exports = registerHandler;