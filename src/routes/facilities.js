const express = require('express');
const router = express.Router();
const {
  getAllFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility
} = require('../controllers/facilities');
const { auth, isAdmin } = require('../middleware/auth');

// Get all facilities (public)
router.get('/', getAllFacilities);

// Get facility by ID (public)
router.get('/:id', getFacilityById);

// Create a new facility (admin only)
router.post('/', auth, isAdmin, createFacility);

// Update a facility (admin only)
router.put('/:id', auth, isAdmin, updateFacility);

// Delete a facility (admin only)
router.delete('/:id', auth, isAdmin, deleteFacility);

module.exports = router;
