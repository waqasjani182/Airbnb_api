const db = require('../config/db');

// Get all facilities
const getAllFacilities = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM Facilities ORDER BY facility_type');
    res.json(result.recordset);
  } catch (error) {
    console.error('Get all facilities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get facility by ID
const getFacilityById = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM Facilities WHERE facility_id = @param0',
      [req.params.id]
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Facility not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Get facility by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new facility (admin only)
const createFacility = async (req, res) => {
  const { facility_type } = req.body;

  if (!facility_type) {
    return res.status(400).json({ message: 'Facility type is required' });
  }

  try {
    // Get the next available facility_id
    const maxIdResult = await db.query('SELECT MAX(facility_id) as max_id FROM Facilities');
    const nextId = (maxIdResult.recordset[0].max_id || 0) + 1;

    const result = await db.query(
      'INSERT INTO Facilities (facility_id, facility_type) OUTPUT INSERTED.* VALUES (@param0, @param1)',
      [nextId, facility_type]
    );

    res.status(201).json({
      message: 'Facility created successfully',
      facility: result.recordset[0]
    });
  } catch (error) {
    console.error('Create facility error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a facility (admin only)
const updateFacility = async (req, res) => {
  const { facility_type } = req.body;
  const facilityId = req.params.id;

  if (!facility_type) {
    return res.status(400).json({ message: 'Facility type is required' });
  }

  try {
    // Check if facility exists
    const checkResult = await db.query(
      'SELECT * FROM Facilities WHERE facility_id = @param0',
      [facilityId]
    );

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Facility not found' });
    }

    // Update facility
    await db.query(
      'UPDATE Facilities SET facility_type = @param0 WHERE facility_id = @param1',
      [facility_type, facilityId]
    );

    // Get updated facility
    const result = await db.query(
      'SELECT * FROM Facilities WHERE facility_id = @param0',
      [facilityId]
    );

    res.json({
      message: 'Facility updated successfully',
      facility: result.recordset[0]
    });
  } catch (error) {
    console.error('Update facility error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a facility (admin only)
const deleteFacility = async (req, res) => {
  const facilityId = req.params.id;

  try {
    // Check if facility exists
    const checkResult = await db.query(
      'SELECT * FROM Facilities WHERE facility_id = @param0',
      [facilityId]
    );

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Facility not found' });
    }

    // Check if facility is in use
    const usageCheck = await db.query(
      'SELECT COUNT(*) as count FROM Property_Facilities WHERE facility_id = @param0',
      [facilityId]
    );

    if (usageCheck.recordset[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete facility as it is in use by properties' 
      });
    }

    // Delete facility
    await db.query(
      'DELETE FROM Facilities WHERE facility_id = @param0',
      [facilityId]
    );

    res.json({ message: 'Facility deleted successfully' });
  } catch (error) {
    console.error('Delete facility error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility
};
