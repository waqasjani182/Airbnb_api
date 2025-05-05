const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertiesByHost,
  searchProperties,
  uploadSinglePropertyImage,
  uploadMultiplePropertyImages
} = require('../controllers/properties');
const { auth, isHost } = require('../middleware/auth');
const { uploadPropertyImage, uploadPropertyImages } = require('../utils/upload');

// Get all properties (public)
router.get('/', getAllProperties);

// Search properties (public)
router.get('/search', searchProperties);

// Get properties by host ID (public)
router.get('/host/:hostId', getPropertiesByHost);

// Get property by ID (public)
router.get('/:id', getPropertyById);

// Create a new property with image upload support (host only)
router.post('/', auth, isHost, uploadPropertyImages, createProperty);

// Update a property with image upload support (host only)
router.put('/:id', auth, isHost, uploadPropertyImages, updateProperty);

// Delete a property (host only)
router.delete('/:id', auth, isHost, deleteProperty);

// Upload a single property image (host only)
router.post('/:id/images', auth, isHost, uploadSinglePropertyImage);

// Upload multiple property images (host only)
router.post('/:id/images/multiple', auth, isHost, uploadMultiplePropertyImages);

module.exports = router;
