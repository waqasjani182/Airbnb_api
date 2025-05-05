const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  changePassword,
  deleteUser,
  uploadUserProfileImage
} = require('../controllers/users');
const { auth } = require('../middleware/auth');

// Get all users (admin only in a real app)
router.get('/', getAllUsers);

// Get user by ID
router.get('/:id', getUserById);

// Update user (protected)
router.put('/', auth, updateUser);

// Change password (protected)
router.put('/change-password', auth, changePassword);

// Delete user (protected)
router.delete('/', auth, deleteUser);

// Upload profile image (protected)
router.post('/profile-image', auth, uploadUserProfileImage);

module.exports = router;
