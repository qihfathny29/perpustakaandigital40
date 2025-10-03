const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Normalize the user object - JWT has userId, but we want id
        req.user = {
            id: decoded.userId,
            userId: decoded.userId, // Keep both for compatibility
            username: decoded.username,
            role: decoded.role
        };
        
        next();
    } catch (error) {
        res.status(401).json({
            status: 'error',
            message: 'Invalid token.'
        });
    }
};

// Role-based middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: 'Insufficient permissions'
            });
        }

        next();
    };
};

module.exports = {
    authMiddleware,
    requireRole
};