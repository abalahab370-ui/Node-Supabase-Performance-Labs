// Handle refresh token and issue a new access token
const jwt = require("jsonwebtoken");

const refreshToken = (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = req.cookies?.jwt ||
      (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

    if (!token) {
      return res.status(401).json({ message: "Refresh token is required." });
    }

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Token is expired or invalid" });
      }

      const userInfo = decoded?.userInfo || decoded;

      const accessToken = jwt.sign(
        { userInfo },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "2h" }
      );

      return res.status(200).json({ accessToken });
    });
  } catch (err) {
    console.log(`Sir we have an error in refreshingToken : ${err}`);
    return res.status(500).json({ message: "Server error while refreshing token" });
  }
};

module.exports = refreshToken;