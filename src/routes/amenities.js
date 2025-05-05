const express = require('express');
const router = express.Router();
const {
  getAllAmenities,
  getAmenityById,
  createAmenity,
  updateAmenity,
  deleteAmenity
} = require('../controllers/amenities');
const { auth, isAdmin } = require('../middleware/auth');

// Get all amenities (public)
router.get('/', getAllAmenities);

// Get amenity by ID (public)
router.get('/:id', getAmenityById);

// Create a new amenity (admin only)
router.post('/', auth, isAdmin, createAmenity);

// Update an amenity (admin only)
router.put('/:id', auth, isAdmin, updateAmenity);

// Delete an amenity (admin only)
router.delete('/:id', auth, isAdmin, deleteAmenity);

module.exports = router;
