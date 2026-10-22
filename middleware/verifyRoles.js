// Middleware to allow only specific roles for a route
const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      const userRole = Number(req.userInfo?.role);
      const isAllowed =
        Number.isFinite(userRole) &&
        allowedRoles.some((role) => Number(role) === userRole);

      if (isAllowed) {
        return next();
      }

      return res.status(403).json({ message: "Forbidden" });
    } catch (err) {
      console.log(`Sir we have a problem in verifying roles: ${err}`);
      return res.status(500).json({ message: "Server error while checking roles" });
    }
  };
};

module.exports = allowRoles;