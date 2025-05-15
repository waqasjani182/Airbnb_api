const db = require('../config/db');

// Get all reviews for a property
const getPropertyReviews = async (req, res) => {
  try {
    const propertyId = req.params.propertyId;

    const result = await db.query(
      `SELECT br.*, u.name as user_name
       FROM Booking_Review br
       JOIN Users u ON br.user_ID = u.user_ID
       WHERE br.property_id = @param0
       ORDER BY br.property_rating DESC`,
      [propertyId]
    );

    res.json({ reviews: result.recordset });
  } catch (error) {
    console.error('Get property reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all reviews by a user
const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT br.*, p.title as property_title, p.city as property_city,
       (SELECT TOP 1 image_url FROM Pictures WHERE property_id = p.property_id) as property_image
       FROM Booking_Review br
       JOIN Properties p ON br.property_id = p.property_id
       WHERE br.user_ID = @param0
       ORDER BY br.property_rating DESC`,
      [userId]
    );

    res.json({ reviews: result.recordset });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new review
const createReview = async (req, res) => {
  const { booking_id, property_id, property_rating, property_review } = req.body;
  const user_ID = req.user.id;

  try {
    // Check if booking exists and belongs to the user
    const bookingCheck = await db.query(
      `SELECT * FROM Booking
       WHERE booking_id = @param0 AND user_ID = @param1 AND property_id = @param2 AND status = 'Completed'`,
      [booking_id, user_ID, property_id]
    );

    if (bookingCheck.recordset.length === 0) {
      return res.status(400).json({
        message: 'You can only review properties from completed bookings'
      });
    }

    // Check if user has already reviewed this booking
    const reviewCheck = await db.query(
      'SELECT * FROM Booking_Review WHERE booking_id = @param0',
      [booking_id]
    );

    if (reviewCheck.recordset.length > 0) {
      return res.status(400).json({ message: 'You have already reviewed this booking' });
    }

    // Create review
    const result = await db.query(
      `INSERT INTO Booking_Review (booking_id, user_ID, property_id, property_rating, property_review)
       VALUES (@param0, @param1, @param2, @param3, @param4);
       SELECT * FROM Booking_Review WHERE booking_id = @param0`,
      [booking_id, user_ID, property_id, property_rating, property_review]
    );

    res.status(201).json({
      message: 'Review created successfully',
      review: result.recordset[0]
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a review
const updateReview = async (req, res) => {
  const { property_rating, property_review } = req.body;
  const bookingId = req.params.id;
  const userId = req.user.id;

  try {
    // Check if review exists and belongs to the user
    const reviewCheck = await db.query(
      'SELECT * FROM Booking_Review WHERE booking_id = @param0 AND user_ID = @param1',
      [bookingId, userId]
    );

    if (reviewCheck.recordset.length === 0) {
      return res.status(404).json({
        message: 'Review not found or you do not have permission to update it'
      });
    }

    // Update review
    const result = await db.query(
      `UPDATE Booking_Review
       SET property_rating = @param0, property_review = @param1
       WHERE booking_id = @param2;
       SELECT * FROM Booking_Review WHERE booking_id = @param2`,
      [property_rating, property_review, bookingId]
    );

    res.json({
      message: 'Review updated successfully',
      review: result.recordset[0]
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a review
const deleteReview = async (req, res) => {
  const bookingId = req.params.id;
  const userId = req.user.id;

  try {
    // Check if review exists and belongs to the user
    const reviewCheck = await db.query(
      'SELECT * FROM Booking_Review WHERE booking_id = @param0 AND user_ID = @param1',
      [bookingId, userId]
    );

    if (reviewCheck.recordset.length === 0) {
      return res.status(404).json({
        message: 'Review not found or you do not have permission to delete it'
      });
    }

    // Delete review
    await db.query('DELETE FROM Booking_Review WHERE booking_id = @param0', [bookingId]);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getPropertyReviews,
  getUserReviews,
  createReview,
  updateReview,
  deleteReview
};
