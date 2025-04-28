const db = require('../config/db');

// Get all bookings for a user (as guest)
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.query(
      `SELECT b.*, p.title, p.city, p.country, p.price_per_night, 
       u.first_name as host_first_name, u.last_name as host_last_name,
       (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = true LIMIT 1) as property_image
       FROM bookings b
       JOIN properties p ON b.property_id = p.id
       JOIN users u ON p.host_id = u.id
       WHERE b.guest_id = $1
       ORDER BY b.check_in_date DESC`,
      [userId]
    );
    
    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all bookings for a host's properties
const getHostBookings = async (req, res) => {
  try {
    const hostId = req.user.id;
    
    const result = await db.query(
      `SELECT b.*, p.title, p.city, p.country, p.price_per_night,
       u.first_name as guest_first_name, u.last_name as guest_last_name,
       (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = true LIMIT 1) as property_image
       FROM bookings b
       JOIN properties p ON b.property_id = p.id
       JOIN users u ON b.guest_id = u.id
       WHERE p.host_id = $1
       ORDER BY b.check_in_date DESC`,
      [hostId]
    );
    
    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Get host bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get booking by ID
const getBookingById = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    
    const result = await db.query(
      `SELECT b.*, p.title, p.description, p.address, p.city, p.state, p.country, 
       p.zip_code, p.price_per_night, p.bedrooms, p.bathrooms, p.max_guests, p.property_type,
       p.host_id, host.first_name as host_first_name, host.last_name as host_last_name,
       guest.first_name as guest_first_name, guest.last_name as guest_last_name,
       (SELECT json_agg(pi.*) FROM property_images pi WHERE pi.property_id = p.id) as property_images
       FROM bookings b
       JOIN properties p ON b.property_id = p.id
       JOIN users host ON p.host_id = host.id
       JOIN users guest ON b.guest_id = guest.id
       WHERE b.id = $1 AND (b.guest_id = $2 OR p.host_id = $2)`,
      [bookingId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found or unauthorized' });
    }
    
    res.json({ booking: result.rows[0] });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new booking
const createBooking = async (req, res) => {
  const { property_id, check_in_date, check_out_date, total_price } = req.body;
  const guest_id = req.user.id;

  try {
    // Check if property exists
    const propertyCheck = await db.query('SELECT * FROM properties WHERE id = $1', [property_id]);
    
    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Check if user is trying to book their own property
    if (propertyCheck.rows[0].host_id === guest_id) {
      return res.status(400).json({ message: 'You cannot book your own property' });
    }
    
    // Check if property is available for the requested dates
    const bookingCheck = await db.query(
      `SELECT * FROM bookings 
       WHERE property_id = $1 
       AND status != 'cancelled'
       AND (
         (check_in_date <= $2 AND check_out_date >= $2) OR
         (check_in_date <= $3 AND check_out_date >= $3) OR
         (check_in_date >= $2 AND check_out_date <= $3)
       )`,
      [property_id, check_in_date, check_out_date]
    );
    
    if (bookingCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Property is not available for the selected dates' });
    }
    
    // Create booking
    const result = await db.query(
      `INSERT INTO bookings (property_id, guest_id, check_in_date, check_out_date, total_price, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [property_id, guest_id, check_in_date, check_out_date, total_price]
    );
    
    res.status(201).json({
      message: 'Booking created successfully',
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update booking status (confirm, cancel, etc.)
const updateBookingStatus = async (req, res) => {
  const { status } = req.body;
  const bookingId = req.params.id;
  const userId = req.user.id;

  // Validate status
  const validStatuses = ['confirmed', 'cancelled', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    // Check if booking exists and user has permission to update it
    const bookingCheck = await db.query(
      `SELECT b.*, p.host_id 
       FROM bookings b
       JOIN properties p ON b.property_id = p.id
       WHERE b.id = $1`,
      [bookingId]
    );
    
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    const booking = bookingCheck.rows[0];
    
    // Check permissions based on status and user role
    if (status === 'confirmed' && booking.host_id !== userId) {
      return res.status(403).json({ message: 'Only the host can confirm bookings' });
    }
    
    if (status === 'cancelled') {
      // Both guest and host can cancel
      if (booking.guest_id !== userId && booking.host_id !== userId) {
        return res.status(403).json({ message: 'Unauthorized to cancel this booking' });
      }
    }
    
    if (status === 'completed' && booking.host_id !== userId) {
      return res.status(403).json({ message: 'Only the host can mark bookings as completed' });
    }
    
    // Update booking status
    const result = await db.query(
      `UPDATE bookings
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, bookingId]
    );
    
    res.json({
      message: `Booking ${status} successfully`,
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserBookings,
  getHostBookings,
  getBookingById,
  createBooking,
  updateBookingStatus
};
