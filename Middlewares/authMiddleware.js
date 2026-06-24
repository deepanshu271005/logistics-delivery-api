
const jwt = require('jsonwebtoken');

// Bouncer 1: Check if the user is logged in (Has a valid wristband)
const protect = (req, res, next) => {
    // Tokens are usually sent in the "Authorization" header
    let token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    try {
        // Standard format is "Bearer <token>", so we remove the word "Bearer "
        if (token.startsWith('Bearer ')) {
            token = token.slice(7, token.length).trimLeft();
        }

        // Verify the token using your secret key from .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach the decoded data (userId, role) to the request object!
        req.user = decoded; 
        
        // Let them through to the next step
        next(); 
    } catch (error) {
        res.status(400).json({ error: "Invalid or expired token." });
    }
};

// Bouncer 2: Check if the user's role is Admin
const adminOnly = (req, res, next) => {
    // req.user was just created by the 'protect' middleware above
    if (req.user && req.user.role === 'Admin') {
        next(); // Let them through to the controller
    } else {
        res.status(403).json({ error: "Access denied. Admin privileges required." });
    }
};

module.exports = { protect, adminOnly };