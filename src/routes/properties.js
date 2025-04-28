const express = require('express');
const router = express.Router();
const {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertiesByHost
} = require('../controllers/properties');
const { auth, isHost } = require('../middleware/auth');

// Get all properties (public)
router.get('/', getAllProperties);

// Get property by ID (public)
router.get('/:id', getPropertyById);

// Create a new property (host only)
router.post('/', auth, isHost, createProperty);

// Update a property (host only)
router.put('/:id', auth, isHost, updateProperty);

// Delete a property (host only)
router.delete('/:id', auth, isHost, deleteProperty);

// Get properties by host ID (public)
router.get('/host/:hostId', getPropertiesByHost);

module.exports = router;
