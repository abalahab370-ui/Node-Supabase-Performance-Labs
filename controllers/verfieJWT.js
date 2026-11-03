const jwt = require("jsonwebtoken");
require("dotenv").config();

const verfieJWT = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication token is required.' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: 'Authentication token is invalid or expired.' });
            }

            // Safe optional chaining to prevent server crash
            const userInfo = decoded?.userInfo || decoded?.UserInfo || decoded;

            req.user = userInfo?.username;
            req.roles = Array.isArray(userInfo?.roles)
                ? userInfo.roles
                : Object.values(userInfo?.roles || {});

            next();
        }
    );
};

module.exports = verfieJWT;