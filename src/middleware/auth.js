const jwt = require('jsonwebtoken');
require('dotenv').config();

const auth = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add user from payload
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if user is a host
const isHost = (req, res, next) => {
  if (!req.user.is_host) {
    return res.status(403).json({ message: 'Access denied. Host privileges required.' });
  }
  next();
};

// Middleware to check if user is an admin
// Note: This is a placeholder. In a real app, you would have an is_admin field in your users table
const isAdmin = (req, res, next) => {
  // For now, we'll just check if the user is a host as a placeholder
  // In a real app, you would check for admin privileges
  if (!req.user.is_host) {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  next();
};

module.exports = { auth, isHost, isAdmin };
