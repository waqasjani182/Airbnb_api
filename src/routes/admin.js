const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const {
  getAllUsersAdmin,
  getAllPropertiesAdmin,
  getAllBookingsAdmin,
  getAllFacilitiesAdmin,
  addFacility,
  deleteFacility,
  updateUserAdminStatus,
  getSystemStats
} = require('../controllers/admin');

// All admin routes require authentication and admin privileges
router.use(auth);
router.use(isAdmin);

// Get system statistics
router.get('/stats', getSystemStats);

// User management
router.get('/users', getAllUsersAdmin);
router.put('/users/:id/admin-status', updateUserAdminStatus);

// Property management
router.get('/properties', getAllPropertiesAdmin);

// Booking management
router.get('/bookings', getAllBookingsAdmin);

// Facility management
router.get('/facilities', getAllFacilitiesAdmin);
router.post('/facilities', addFacility);
router.delete('/facilities/:id', deleteFacility);

module.exports = router;
