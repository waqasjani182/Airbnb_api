const db = require('../config/db');
const { hashPassword } = require('../utils/password');

// Get all users (admin only in a real app)
const getAllUsers = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, first_name, last_name, email, phone, profile_image, is_host, created_at FROM users'
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, first_name, last_name, email, phone, profile_image, is_host, created_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user
const updateUser = async (req, res) => {
  const { first_name, last_name, phone, profile_image } = req.body;
  const userId = req.user.id;

  try {
    const result = await db.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, phone = $3, profile_image = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, first_name, last_name, email, phone, profile_image, is_host, created_at, updated_at`,
      [first_name, last_name, phone, profile_image, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'User updated successfully',
      user: result.rows[0] 
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
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
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
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  changePassword,
  deleteUser
};
