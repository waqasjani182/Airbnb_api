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
  searchProperties
} = require('../controllers/properties');
const { auth, isHost } = require('../middleware/auth');
const { uploadPropertyImages } = require('../utils/upload');

// Get all properties (public)
router.get('/', getAllProperties);

// Search properties (public)
router.get('/search', searchProperties);

// Get properties by host ID (public)
router.get('/host/:hostId', getPropertiesByHost);

// Get property by ID (public)
router.get('/:id', getPropertyById);

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files' });
    }
    return res.status(400).json({ message: 'File upload error', error: err.message });
  }
  if (err.message === 'Only image files are allowed!') {
    return res.status(400).json({ message: 'Only image files are allowed' });
  }
  next(err);
};

// Create a new property with image upload support (host only)
router.post('/', auth, isHost, (req, res, next) => {
  uploadPropertyImages(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, createProperty);

// Update a property with image upload support (host only)
router.put('/:id', auth, isHost, (req, res, next) => {
  uploadPropertyImages(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, updateProperty);

// Delete a property (host only)
router.delete('/:id', auth, isHost, deleteProperty);

module.exports = router;
