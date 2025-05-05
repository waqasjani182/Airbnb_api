const db = require('../config/db');

// Get all amenities
const getAllAmenities = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM amenities ORDER BY name');
    res.json(result.recordset);
  } catch (error) {
    console.error('Get all amenities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get amenity by ID
const getAmenityById = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM amenities WHERE id = $1',
      [req.params.id]
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Amenity not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Get amenity by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new amenity (admin only in a real app)
const createAmenity = async (req, res) => {
  const { name, icon } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  try {
    const result = await db.query(
      'INSERT INTO amenities (name, icon) OUTPUT INSERTED.* VALUES ($1, $2)',
      [name, icon || null]
    );

    res.status(201).json({
      message: 'Amenity created successfully',
      amenity: result.recordset[0]
    });
  } catch (error) {
    console.error('Create amenity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update an amenity (admin only in a real app)
const updateAmenity = async (req, res) => {
  const { name, icon } = req.body;
  const amenityId = req.params.id;

  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  try {
    // Check if amenity exists
    const checkResult = await db.query(
      'SELECT * FROM amenities WHERE id = $1',
      [amenityId]
    );

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Amenity not found' });
    }

    // Update amenity
    await db.query(
      'UPDATE amenities SET name = $1, icon = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [name, icon || null, amenityId]
    );

    // Get updated amenity
    const result = await db.query(
      'SELECT * FROM amenities WHERE id = $1',
      [amenityId]
    );

    res.json({
      message: 'Amenity updated successfully',
      amenity: result.recordset[0]
    });
  } catch (error) {
    console.error('Update amenity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete an amenity (admin only in a real app)
const deleteAmenity = async (req, res) => {
  const amenityId = req.params.id;

  try {
    // Check if amenity exists
    const checkResult = await db.query(
      'SELECT * FROM amenities WHERE id = $1',
      [amenityId]
    );

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Amenity not found' });
    }

    // Delete amenity
    await db.query(
      'DELETE FROM amenities WHERE id = $1',
      [amenityId]
    );

    res.json({ message: 'Amenity deleted successfully' });
  } catch (error) {
    console.error('Delete amenity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllAmenities,
  getAmenityById,
  createAmenity,
  updateAmenity,
  deleteAmenity
};
