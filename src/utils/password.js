// No encryption - store passwords as plain text
const hashPassword = async (password) => {
  return password; // Return password as-is without hashing
};

// Compare password - direct string comparison
const comparePassword = async (password, storedPassword) => {
  return password === storedPassword; // Direct comparison
};

module.exports = {
  hashPassword,
  comparePassword
};
