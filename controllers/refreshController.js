// Handle refresh token and issue a new access token
const jwt = require("jsonwebtoken");

const refreshToken = (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Refresh token is required." });
    }

    const token = authHeader.split(" ")[1];
    let userInfo = {};

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Token is expired or invalid" });
      }

      userInfo = decoded?.userInfo || decoded;

      const accessToken = jwt.sign(
        userInfo,
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: 4 * 60 * 60 }
      );

      return res.status(200).json({ accessToken });
    });
  } catch (err) {
    console.log(`Sir we have an error in refreshingToken : ${err}`);
    return res.status(500).json({ message: "Server error while refreshing token" });
  }
};

module.exports = refreshToken;