const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import routes
const userRoutes = require('./routes/users');
const propertyRoutes = require('./routes/properties');
const bookingRoutes = require('./routes/bookings');
const reviewRoutes = require('./routes/reviews');
const authRoutes = require('./routes/auth');
const amenityRoutes = require('./routes/amenities');
const facilityRoutes = require('./routes/facilities');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3004;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Make BASE_URL available to all routes
app.locals.BASE_URL = BASE_URL;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/amenities', amenityRoutes);
app.use('/api/facilities', facilityRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Airbnb API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
