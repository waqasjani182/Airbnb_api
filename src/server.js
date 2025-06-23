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
const adminRoutes = require('./routes/admin');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3004;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Make BASE_URL available to all routes
app.locals.BASE_URL = BASE_URL;

// Serve static files from public directory with proper headers FIRST
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/amenities', amenityRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/admin', adminRoutes);

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
