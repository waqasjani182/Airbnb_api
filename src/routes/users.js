const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  changePassword,
  deleteUser,
  uploadUserProfileImage,
  getUserProperties,
  updateUserProfileWithImage
} = require('../controllers/users');
const { auth } = require('../middleware/auth');

// Get all users (admin only in a real app)
router.get('/', getAllUsers);

// Change password (protected) - must be before /:id
router.put('/change-password', auth, changePassword);

// Upload profile image (protected) - must be before /:id
router.post('/profile-image', auth, uploadUserProfileImage);

// Get user's properties (protected) - must be before /:id
router.get('/properties', auth, getUserProperties);

// Update user profile with optional image upload (protected) - must be before /:id
router.put('/profile', auth, updateUserProfileWithImage);

// Get user by ID - must be after specific routes
router.get('/:id', getUserById);

// Update user (protected)
router.put('/', auth, updateUser);

// Delete user (protected)
router.delete('/', auth, deleteUser);

module.exports = router;
