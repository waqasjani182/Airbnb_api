const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
require('dotenv').config();

// Register a new user
const register = async (req, res) => {
  const { name, email, password, address, phone_No } = req.body;

  try {
    // Check if user already exists
    const userExists = await db.query(
      'SELECT * FROM Users WHERE email = @param0',
      [email]
    );

    if (userExists.recordset && userExists.recordset.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Get the next available user_ID
    const maxIdResult = await db.query('SELECT MAX(user_ID) as max_id FROM Users');
    const nextUserId = (maxIdResult.recordset[0].max_id || 0) + 1;

    // Create new user with OUTPUT clause to get the inserted record
    const result = await db.query(
      `INSERT INTO Users
       (user_ID, name, email, password, address, phone_No)
       OUTPUT INSERTED.*
       VALUES (@param0, @param1, @param2, @param3, @param4, @param5)`,
      [nextUserId, name, email, hashedPassword, address, phone_No]
    );

    const user = result.recordset[0];

    // Create JWT token
    const token = jwt.sign(
      { user_ID: user.user_ID, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        user_ID: user.user_ID,
        name: user.name,
        email: user.email,
        address: user.address,
        phone_No: user.phone_No,
        profile_image: user.profile_image
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const result = await db.query('SELECT * FROM Users WHERE email = @param0', [email]);

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.recordset[0];

    // Check password
    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { user_ID: user.user_ID, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        user_ID: user.user_ID,
        name: user.name,
        email: user.email,
        address: user.address,
        phone_No: user.phone_No,
        profile_image: user.profile_image
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM Users WHERE user_ID = @param0',
      [req.user.user_ID]
    );

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.recordset[0];

    res.json({
      user: {
        user_ID: user.user_ID,
        name: user.name,
        email: user.email,
        address: user.address,
        phone_No: user.phone_No,
        profile_image: user.profile_image
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser
};
