const cookieOptions = require("../../config/authCookieOptions");

const logoutHandler = (req, res) => {
  try {
    const cookies = req.cookies;

    // If no cookie exists, client is already logged out
    if (!cookies?.jwt) {
      return res.sendStatus(204); // No Content
    }

    // Clear the httpOnly cookie statelessly
    res.clearCookie("jwt", {
      ...cookieOptions,
      maxAge: 0
    });

    return res.status(200).json({
      message: "Successfully logged out."
    });

  } catch (err) {
    console.error("Logout handler failed:", err);
    return res.status(500).json({
      message: "Server error while logging out."
    });
  }
};

module.exports = logoutHandler;