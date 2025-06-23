const db = require('../config/db');

// Check property availability for booking
const checkPropertyAvailability = async (req, res) => {
  try {
    const { property_id, start_date, end_date, guests } = req.query;

    // Validate required fields
    if (!property_id || !start_date || !end_date) {
      return res.status(400).json({
        message: 'Property ID, start date, and end date are required'
      });
    }

    // Validate booking dates
    const dateValidation = validateBookingDates(start_date, end_date);
    if (!dateValidation.isValid) {
      return res.status(400).json({ message: dateValidation.message });
    }

    // Check if property exists
    const propertyCheck = await db.query(
      'SELECT * FROM Properties WHERE property_id = @param0',
      [property_id]
    );

    if (propertyCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const property = propertyCheck.recordset[0];

    // Validate guest count if provided
    if (guests && guests > property.guest) {
      return res.status(400).json({
        message: `Property can accommodate maximum ${property.guest} guests`,
        max_guests: property.guest,
        requested_guests: parseInt(guests)
      });
    }

    // Check if property is available for the requested dates
    const bookingCheck = await db.query(
      `SELECT booking_id, start_date, end_date, status, guests
       FROM Booking
       WHERE property_id = @param0
       AND status != 'Cancelled'
       AND (
         (start_date <= @param1 AND end_date >= @param1) OR
         (start_date <= @param2 AND end_date >= @param2) OR
         (start_date >= @param1 AND end_date <= @param2)
       )`,
      [property_id, start_date, end_date]
    );

    const isAvailable = bookingCheck.recordset.length === 0;

    // Calculate total amount if available
    let totalAmount = null;
    if (isAvailable) {
      totalAmount = calculateTotalAmount(start_date, end_date, property.rent_per_day);
    }

    // Get existing bookings for context (optional)
    const existingBookings = await db.query(
      `SELECT start_date, end_date, status
       FROM Booking
       WHERE property_id = @param0
       AND status != 'Cancelled'
       AND end_date >= GETDATE()
       ORDER BY start_date ASC`,
      [property_id]
    );

    res.json({
      property_id: parseInt(property_id),
      available: isAvailable,
      check_in_date: start_date,
      check_out_date: end_date,
      number_of_days: dateValidation.numberOfDays,
      guests: guests ? parseInt(guests) : null,
      max_guests: property.guest,
      price_per_day: property.rent_per_day,
      total_amount: totalAmount,
      conflicting_bookings: isAvailable ? [] : bookingCheck.recordset,
      upcoming_bookings: existingBookings.recordset.slice(0, 5), // Show next 5 bookings
      property_details: {
        title: property.title,
        city: property.city,
        property_type: property.property_type
      }
    });
  } catch (error) {
    console.error('Check property availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all bookings for a user (as guest)
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT b.*, p.title, p.city, p.rent_per_day,
       u.name as host_name,
       (SELECT TOP 1 image_url FROM Pictures WHERE property_id = p.property_id) as property_image
       FROM Booking b
       JOIN Properties p ON b.property_id = p.property_id
       JOIN Users u ON p.user_id = u.user_ID
       WHERE b.user_ID = @param0
       ORDER BY b.start_date DESC`,
      [userId]
    );

    res.json({ bookings: result.recordset });
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
      `SELECT b.*, p.title, p.city, p.rent_per_day,
       u.name as guest_name,
       (SELECT TOP 1 image_url FROM Pictures WHERE property_id = p.property_id) as property_image
       FROM Booking b
       JOIN Properties p ON b.property_id = p.property_id
       JOIN Users u ON b.user_ID = u.user_ID
       WHERE p.user_id = @param0
       ORDER BY b.start_date DESC`,
      [hostId]
    );

    res.json({ bookings: result.recordset });
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
      `SELECT b.*, p.title, p.description, p.address, p.city, p.rent_per_day,
       p.property_type, p.guest, p.user_id as host_id,
       host.name as host_name,
       guest.name as guest_name,
       (SELECT STRING_AGG(image_url, ',') FROM Pictures WHERE property_id = p.property_id) as property_images
       FROM Booking b
       JOIN Properties p ON b.property_id = p.property_id
       JOIN Users host ON p.user_id = host.user_ID
       JOIN Users guest ON b.user_ID = guest.user_ID
       WHERE b.booking_id = @param0 AND (b.user_ID = @param1 OR p.user_id = @param1)`,
      [bookingId, userId]
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Booking not found or unauthorized' });
    }

    // Parse property images string into array
    const booking = result.recordset[0];
    if (booking.property_images) {
      booking.property_images = booking.property_images.split(',').map(url => ({ image_url: url }));
    } else {
      booking.property_images = [];
    }

    res.json({ booking });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to calculate total amount
const calculateTotalAmount = (startDate, endDate, rentPerDay) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDifference = end.getTime() - start.getTime();
  const numberOfDays = Math.ceil(timeDifference / (1000 * 3600 * 24));
  return numberOfDays * rentPerDay;
};

// Helper function to validate booking dates
const validateBookingDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day

  if (start < today) {
    return { isValid: false, message: 'Start date cannot be in the past' };
  }

  if (end <= start) {
    return { isValid: false, message: 'End date must be after start date' };
  }

  const timeDifference = end.getTime() - start.getTime();
  const numberOfDays = Math.ceil(timeDifference / (1000 * 3600 * 24));

  if (numberOfDays > 365) {
    return { isValid: false, message: 'Booking cannot exceed 365 days' };
  }

  return { isValid: true, numberOfDays };
};

// Create a new booking
const createBooking = async (req, res) => {
  const { property_id, start_date, end_date, guests } = req.body;
  const user_ID = req.user.id;

  try {
    // Validate required fields
    if (!property_id || !start_date || !end_date) {
      return res.status(400).json({
        message: 'Property ID, start date, and end date are required'
      });
    }

    // Validate booking dates
    const dateValidation = validateBookingDates(start_date, end_date);
    if (!dateValidation.isValid) {
      return res.status(400).json({ message: dateValidation.message });
    }

    // Check if property exists
    const propertyCheck = await db.query(
      'SELECT * FROM Properties WHERE property_id = @param0',
      [property_id]
    );

    if (propertyCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const property = propertyCheck.recordset[0];

    // Check if user is trying to book their own property
    if (property.user_id === user_ID) {
      return res.status(400).json({ message: 'You cannot book your own property' });
    }

    // Validate guest count
    if (guests && guests > property.guest) {
      return res.status(400).json({
        message: `Property can accommodate maximum ${property.guest} guests`
      });
    }

    // Check if property is available for the requested dates
    const bookingCheck = await db.query(
      `SELECT * FROM Booking
       WHERE property_id = @param0
       AND status != 'Cancelled'
       AND (
         (start_date <= @param1 AND end_date >= @param1) OR
         (start_date <= @param2 AND end_date >= @param2) OR
         (start_date >= @param1 AND end_date <= @param2)
       )`,
      [property_id, start_date, end_date]
    );

    if (bookingCheck.recordset.length > 0) {
      return res.status(400).json({
        message: 'Property is not available for the selected dates'
      });
    }

    // Calculate total amount
    const totalAmount = calculateTotalAmount(start_date, end_date, property.rent_per_day);

    // Get the next booking ID
    const maxIdResult = await db.query('SELECT MAX(booking_id) as max_id FROM Booking');
    const nextId = (maxIdResult.recordset[0].max_id || 0) + 1;

    // Create booking
    const currentDate = new Date().toISOString().split('T')[0];

    const result = await db.query(
      `INSERT INTO Booking (booking_id, property_id, user_ID, status, booking_date, start_date, end_date, total_amount, guests)
       VALUES (@param0, @param1, @param2, 'Pending', @param3, @param4, @param5, @param6, @param7);
       SELECT b.*, p.title, p.city, p.rent_per_day, p.address, p.property_type,
              u.name as host_name,
              (SELECT TOP 1 image_url FROM Pictures WHERE property_id = p.property_id) as property_image
       FROM Booking b
       JOIN Properties p ON b.property_id = p.property_id
       JOIN Users u ON p.user_id = u.user_ID
       WHERE b.booking_id = @param0`,
      [nextId, property_id, user_ID, currentDate, start_date, end_date, totalAmount, guests || property.guest]
    );

    const booking = result.recordset[0];

    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        ...booking,
        number_of_days: dateValidation.numberOfDays,
        total_amount: totalAmount
      }
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
  const validStatuses = ['Confirmed', 'Cancelled', 'Completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    // Check if booking exists and user has permission to update it
    const bookingCheck = await db.query(
      `SELECT b.*, p.user_id as host_id
       FROM Booking b
       JOIN Properties p ON b.property_id = p.property_id
       WHERE b.booking_id = @param0`,
      [bookingId]
    );

    if (bookingCheck.recordset.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookingCheck.recordset[0];

    // Check permissions based on status and user role
    if (status === 'Confirmed' && booking.host_id !== userId) {
      return res.status(403).json({ message: 'Only the host can confirm bookings' });
    }

    if (status === 'Cancelled') {
      // Both guest and host can cancel
      if (booking.user_ID !== userId && booking.host_id !== userId) {
        return res.status(403).json({ message: 'Unauthorized to cancel this booking' });
      }
    }

    if (status === 'Completed' && booking.host_id !== userId) {
      return res.status(403).json({ message: 'Only the host can mark bookings as completed' });
    }

    // Update booking status
    const result = await db.query(
      `UPDATE Booking
       SET status = @param0
       WHERE booking_id = @param1;
       SELECT * FROM Booking WHERE booking_id = @param1`,
      [status, bookingId]
    );

    res.json({
      message: `Booking ${status.toLowerCase()} successfully`,
      booking: result.recordset[0]
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  checkPropertyAvailability,
  getUserBookings,
  getHostBookings,
  getBookingById,
  createBooking,
  updateBookingStatus
};
