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
// In our new schema, we don't have an is_host field, so we'll assume all users can be hosts
const isHost = (req, res, next) => {
  // For now, we'll allow all authenticated users to be hosts
  next();
};

// Middleware to check if user is an admin
// In our new schema, we don't have an is_admin field, so we'll use a specific user ID as admin
const isAdmin = (req, res, next) => {
  // For now, we'll consider user with ID 1 as admin
  if (req.user.user_ID !== 1) {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  next();
};

module.exports = { auth, isHost, isAdmin };
