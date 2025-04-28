const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser } = require('../controllers/auth');
const { auth } = require('../middleware/auth');

// Register a new user
router.post('/register', register);

// Login user
router.post('/login', login);

// Get current user
router.get('/me', auth, getCurrentUser);

module.exports = router;
