// Middleware to allow only specific roles for a route
const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      const userRoles = req.userInfo?.roles || [];
      const normalizedRoles = Array.isArray(userRoles)
        ? userRoles
        : Object.values(userRoles);

      const isAllowed = normalizedRoles.some((role) => allowedRoles.includes(role));

      if (isAllowed) {
        return next();
      }

      return res.status(401).json({ message: "Unauthorized" });
    } catch (err) {
      console.log(`Sir we have a problem in verifying roles: ${err}`);
      return res.status(500).json({ message: "Server error while checking roles" });
    }
  };
};

module.exports = allowRoles;