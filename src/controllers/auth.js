const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
require('dotenv').config();

// Register a new user
const register = async (req, res) => {
  const { first_name, last_name, email, password, phone, is_host } = req.body;

  try {
    // Check if user already exists
    const userExists = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.recordset && userExists.recordset.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user with OUTPUT clause to get the inserted record
    const result = await db.query(
      `INSERT INTO users
       (first_name, last_name, email, password, phone, is_host)
       OUTPUT INSERTED.id, INSERTED.first_name, INSERTED.last_name, INSERTED.email,
              INSERTED.phone, INSERTED.is_host, INSERTED.created_at
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [first_name, last_name, email, hashedPassword, phone, is_host || false]
    );

    const user = result.recordset[0];

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, is_host: user.is_host },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        is_host: user.is_host,
        created_at: user.created_at
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
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

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
      { id: user.id, email: user.email, is_host: user.is_host },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        is_host: user.is_host,
        profile_image: user.profile_image,
        created_at: user.created_at
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
      'SELECT id, first_name, last_name, email, phone, profile_image, is_host, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: result.recordset[0] });
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
