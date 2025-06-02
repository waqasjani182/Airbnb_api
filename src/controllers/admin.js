const db = require('../config/db');

// Get all users (admin only)
const getAllUsersAdmin = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT user_ID, name, email, address, phone_No, profile_image, is_admin FROM Users ORDER BY user_ID'
    );

    res.json({ users: result.recordset });
  } catch (error) {
    console.error('Get all users admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all properties (admin only)
const getAllPropertiesAdmin = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, u.name as owner_name, u.email as owner_email,
       (SELECT TOP 1 image_url FROM Pictures WHERE property_id = p.property_id) as primary_image,
       (SELECT COUNT(*) FROM Booking WHERE property_id = p.property_id) as booking_count
       FROM Properties p
       LEFT JOIN Users u ON p.user_id = u.user_ID
       ORDER BY p.property_id DESC`
    );

    res.json({ properties: result.recordset });
  } catch (error) {
    console.error('Get all properties admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all bookings (admin only)
const getAllBookingsAdmin = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*, 
       u.name as guest_name, u.email as guest_email,
       p.title as property_title, p.address as property_address,
       owner.name as owner_name, owner.email as owner_email
       FROM Booking b
       LEFT JOIN Users u ON b.user_ID = u.user_ID
       LEFT JOIN Properties p ON b.property_id = p.property_id
       LEFT JOIN Users owner ON p.user_id = owner.user_ID
       ORDER BY b.booking_date DESC`
    );

    res.json({ bookings: result.recordset });
  } catch (error) {
    console.error('Get all bookings admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all facilities (admin only)
const getAllFacilitiesAdmin = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM Facilities ORDER BY facility_id'
    );

    res.json({ facilities: result.recordset });
  } catch (error) {
    console.error('Get all facilities admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add new facility (admin only)
const addFacility = async (req, res) => {
  try {
    const { facility_type } = req.body;

    if (!facility_type) {
      return res.status(400).json({ message: 'Facility type is required' });
    }

    // Get the next facility ID
    const maxIdResult = await db.query('SELECT MAX(facility_id) as max_id FROM Facilities');
    const nextId = (maxIdResult.recordset[0].max_id || 0) + 1;

    const result = await db.query(
      'INSERT INTO Facilities (facility_id, facility_type) OUTPUT INSERTED.* VALUES ($1, $2)',
      [nextId, facility_type]
    );

    res.status(201).json({
      message: 'Facility added successfully',
      facility: result.recordset[0]
    });
  } catch (error) {
    console.error('Add facility error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete facility (admin only)
const deleteFacility = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if facility exists
    const checkResult = await db.query(
      'SELECT * FROM Facilities WHERE facility_id = $1',
      [id]
    );

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Facility not found' });
    }

    // Delete facility (this will also remove related property_facilities due to foreign key)
    await db.query('DELETE FROM Facilities WHERE facility_id = $1', [id]);

    res.json({ message: 'Facility deleted successfully' });
  } catch (error) {
    console.error('Delete facility error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user admin status (admin only)
const updateUserAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_admin } = req.body;

    if (typeof is_admin !== 'boolean') {
      return res.status(400).json({ message: 'is_admin must be a boolean value' });
    }

    // Prevent removing admin status from the last admin
    if (!is_admin) {
      const adminCountResult = await db.query('SELECT COUNT(*) as admin_count FROM Users WHERE is_admin = 1');
      if (adminCountResult.recordset[0].admin_count <= 1) {
        return res.status(400).json({ message: 'Cannot remove admin status. At least one admin must exist.' });
      }
    }

    const result = await db.query(
      'UPDATE Users SET is_admin = $1 OUTPUT INSERTED.* WHERE user_ID = $2',
      [is_admin ? 1 : 0, id]
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User admin status updated successfully',
      user: result.recordset[0]
    });
  } catch (error) {
    console.error('Update user admin status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get system statistics (admin only)
const getSystemStats = async (req, res) => {
  try {
    const [usersResult, propertiesResult, bookingsResult, facilitiesResult] = await Promise.all([
      db.query('SELECT COUNT(*) as total_users, SUM(CAST(is_admin as INT)) as total_admins FROM Users'),
      db.query('SELECT COUNT(*) as total_properties FROM Properties'),
      db.query('SELECT COUNT(*) as total_bookings, SUM(total_amount) as total_revenue FROM Booking'),
      db.query('SELECT COUNT(*) as total_facilities FROM Facilities')
    ]);

    const stats = {
      users: {
        total: usersResult.recordset[0].total_users,
        admins: usersResult.recordset[0].total_admins,
        regular: usersResult.recordset[0].total_users - usersResult.recordset[0].total_admins
      },
      properties: {
        total: propertiesResult.recordset[0].total_properties
      },
      bookings: {
        total: bookingsResult.recordset[0].total_bookings,
        revenue: bookingsResult.recordset[0].total_revenue || 0
      },
      facilities: {
        total: facilitiesResult.recordset[0].total_facilities
      }
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllUsersAdmin,
  getAllPropertiesAdmin,
  getAllBookingsAdmin,
  getAllFacilitiesAdmin,
  addFacility,
  deleteFacility,
  updateUserAdminStatus,
  getSystemStats
};
