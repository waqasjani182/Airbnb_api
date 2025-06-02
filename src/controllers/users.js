const db = require('../config/db');
const { hashPassword } = require('../utils/password');
const { uploadProfileImage } = require('../utils/upload');

// Get all users (admin only in a real app)
const getAllUsers = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT user_ID, name, email, address, phone_No, profile_image FROM Users'
    );
    res.json({ users: result.recordset });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT user_ID, name, email, address, phone_No, profile_image FROM Users WHERE user_ID = @param0',
      [req.params.id]
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: result.recordset[0] });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user
const updateUser = async (req, res) => {
  const { name, email, address, phone_No, profile_image } = req.body;
  const userId = req.user.id;

  try {
    const result = await db.query(
      `UPDATE Users
       SET name = @param0, email = @param1, address = @param2, phone_No = @param3, profile_image = @param4
       OUTPUT INSERTED.*
       WHERE user_ID = @param5`,
      [name, email, address, phone_No, profile_image, userId]
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: result.recordset[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change password
const changePassword = async (req, res) => {
  const { new_password } = req.body;
  const userId = req.user.id;

  try {
    // Hash new password
    const hashedPassword = await hashPassword(new_password);

    await db.query(
      'UPDATE Users SET password = @param0 WHERE user_ID = @param1',
      [hashedPassword, userId]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  const userId = req.user.id;

  try {
    await db.query('DELETE FROM Users WHERE user_ID = @param0', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload profile image
const uploadUserProfileImage = (req, res) => {
  uploadProfileImage(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        message: 'Error uploading profile image',
        error: err.message
      });
    }

    // If no file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      const userId = req.user.id;
      const relativePath = `/uploads/profile-images/${req.file.filename}`;
      // Store the full URL in the database by combining BASE_URL with the relative path
      const profileImageUrl = `${req.app.locals.BASE_URL}${relativePath}`;

      // Update user's profile_image in database
      await db.query(
        `UPDATE Users
         SET profile_image = @param0
         WHERE user_ID = @param1`,
        [profileImageUrl, userId]
      );

      // Fetch the updated user data
      const result = await db.query(
        `SELECT user_ID, name, email, address, phone_No, profile_image
         FROM Users
         WHERE user_ID = @param0`,
        [userId]
      );

      if (result.recordset.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        message: 'Profile image uploaded successfully',
        user: result.recordset[0]
      });
    } catch (error) {
      console.error('Upload profile image error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
};

// Get user's properties
const getUserProperties = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT p.*,
       (SELECT TOP 1 image_url FROM Pictures WHERE property_id = p.property_id) as primary_image,
       (SELECT COUNT(*) FROM Booking WHERE property_id = p.property_id) as booking_count
       FROM Properties p
       WHERE p.user_id = $1
       ORDER BY p.property_id DESC`,
      [userId]
    );

    res.json({ properties: result.recordset });
  } catch (error) {
    console.error('Get user properties error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile with optional image upload
const updateUserProfileWithImage = (req, res) => {
  uploadProfileImage(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        message: 'Error uploading profile image',
        error: err.message
      });
    }

    try {
      const userId = req.user.id;
      const { name, email, address, phone_No } = req.body;

      let profileImageUrl = null;

      // If a file was uploaded, construct the URL
      if (req.file) {
        const relativePath = `/uploads/profile-images/${req.file.filename}`;
        profileImageUrl = `${req.app.locals.BASE_URL}${relativePath}`;
      }

      // Build update query dynamically based on provided fields
      let updateFields = [];
      let params = [];
      let paramIndex = 0;

      if (name) {
        updateFields.push(`name = @param${paramIndex}`);
        params.push(name);
        paramIndex++;
      }
      if (email) {
        updateFields.push(`email = @param${paramIndex}`);
        params.push(email);
        paramIndex++;
      }
      if (address) {
        updateFields.push(`address = @param${paramIndex}`);
        params.push(address);
        paramIndex++;
      }
      if (phone_No) {
        updateFields.push(`phone_No = @param${paramIndex}`);
        params.push(phone_No);
        paramIndex++;
      }
      if (profileImageUrl) {
        updateFields.push(`profile_image = @param${paramIndex}`);
        params.push(profileImageUrl);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      // Add userId as the last parameter
      params.push(userId);

      const result = await db.query(
        `UPDATE Users
         SET ${updateFields.join(', ')}
         OUTPUT INSERTED.*
         WHERE user_ID = @param${paramIndex}`,
        params
      );

      if (result.recordset.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        message: 'User profile updated successfully',
        user: result.recordset[0]
      });
    } catch (error) {
      console.error('Update user profile with image error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  changePassword,
  deleteUser,
  uploadUserProfileImage,
  getUserProperties,
  updateUserProfileWithImage
};
