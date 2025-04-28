const db = require('../config/db');

// Get all reviews for a property
const getPropertyReviews = async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    
    const result = await db.query(
      `SELECT r.*, u.first_name, u.last_name, u.profile_image
       FROM reviews r
       JOIN users u ON r.guest_id = u.id
       WHERE r.property_id = $1
       ORDER BY r.created_at DESC`,
      [propertyId]
    );
    
    res.json({ reviews: result.rows });
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
      `SELECT r.*, p.title as property_title, p.city as property_city,
       (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = true LIMIT 1) as property_image
       FROM reviews r
       JOIN properties p ON r.property_id = p.id
       WHERE r.guest_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );
    
    res.json({ reviews: result.rows });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new review
const createReview = async (req, res) => {
  const { booking_id, property_id, rating, comment } = req.body;
  const guest_id = req.user.id;

  try {
    // Check if booking exists and belongs to the user
    const bookingCheck = await db.query(
      `SELECT * FROM bookings 
       WHERE id = $1 AND guest_id = $2 AND property_id = $3 AND status = 'completed'`,
      [booking_id, guest_id, property_id]
    );
    
    if (bookingCheck.rows.length === 0) {
      return res.status(400).json({ 
        message: 'You can only review properties from completed bookings' 
      });
    }
    
    // Check if user has already reviewed this booking
    const reviewCheck = await db.query(
      'SELECT * FROM reviews WHERE booking_id = $1',
      [booking_id]
    );
    
    if (reviewCheck.rows.length > 0) {
      return res.status(400).json({ message: 'You have already reviewed this booking' });
    }
    
    // Create review
    const result = await db.query(
      `INSERT INTO reviews (booking_id, property_id, guest_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [booking_id, property_id, guest_id, rating, comment]
    );
    
    res.status(201).json({
      message: 'Review created successfully',
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a review
const updateReview = async (req, res) => {
  const { rating, comment } = req.body;
  const reviewId = req.params.id;
  const userId = req.user.id;

  try {
    // Check if review exists and belongs to the user
    const reviewCheck = await db.query(
      'SELECT * FROM reviews WHERE id = $1 AND guest_id = $2',
      [reviewId, userId]
    );
    
    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Review not found or you do not have permission to update it' 
      });
    }
    
    // Update review
    const result = await db.query(
      `UPDATE reviews
       SET rating = $1, comment = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [rating, comment, reviewId]
    );
    
    res.json({
      message: 'Review updated successfully',
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a review
const deleteReview = async (req, res) => {
  const reviewId = req.params.id;
  const userId = req.user.id;

  try {
    // Check if review exists and belongs to the user
    const reviewCheck = await db.query(
      'SELECT * FROM reviews WHERE id = $1 AND guest_id = $2',
      [reviewId, userId]
    );
    
    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Review not found or you do not have permission to delete it' 
      });
    }
    
    // Delete review
    await db.query('DELETE FROM reviews WHERE id = $1', [reviewId]);
    
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
