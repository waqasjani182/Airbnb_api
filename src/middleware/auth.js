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
    req.user = {
      id: decoded.user_ID,
      user_ID: decoded.user_ID,
      email: decoded.email
    };
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
const isAdmin = async (req, res, next) => {
  try {
    const db = require('../config/db');
    const userId = req.user.user_ID;

    // Check if user is admin in database
    const result = await db.query(
      'SELECT is_admin FROM Users WHERE user_ID = $1',
      [userId]
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!result.recordset[0].is_admin) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'Server error during admin verification.' });
  }
};

module.exports = { auth, isHost, isAdmin };
