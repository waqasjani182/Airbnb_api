const express = require('express');
const router = express.Router();
const {
  getPropertyReviews,
  getUserReviews,
  createReview,
  updateReview,
  deleteReview
} = require('../controllers/reviews');
const { auth } = require('../middleware/auth');

// Get all reviews for a property
router.get('/property/:propertyId', getPropertyReviews);

// Get all reviews by a user
router.get('/user', auth, getUserReviews);

// Create a new review
router.post('/', auth, createReview);

// Update a review
router.put('/:id', auth, updateReview);

// Delete a review
router.delete('/:id', auth, deleteReview);

module.exports = router;
