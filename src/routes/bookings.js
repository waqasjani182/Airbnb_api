const express = require('express');
const router = express.Router();
const {
  checkPropertyAvailability,
  getUserBookings,
  getHostBookings,
  getBookingById,
  createBooking,
  updateBookingStatus
} = require('../controllers/bookings');
const { auth, isHost } = require('../middleware/auth');

// Check property availability (public endpoint)
router.get('/availability', checkPropertyAvailability);

// Get all bookings for a user (as guest)
router.get('/user', auth, getUserBookings);

// Get all bookings for a host's properties
router.get('/host', auth, isHost, getHostBookings);

// Get booking by ID
router.get('/:id', auth, getBookingById);

// Create a new booking
router.post('/', auth, createBooking);

// Update booking status (confirm, cancel, etc.)
router.put('/:id/status', auth, updateBookingStatus);

module.exports = router;
