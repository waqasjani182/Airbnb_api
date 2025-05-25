-- Schema for Airbnb database

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  profile_image VARCHAR(255),
  is_host BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Properties table
CREATE TABLE properties (
  id SERIAL PRIMARY KEY,
  host_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  country VARCHAR(100) NOT NULL,
  zip_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  price_per_night DECIMAL(10, 2) NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms INTEGER NOT NULL,
  max_guests INTEGER NOT NULL,
  property_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Property images table
CREATE TABLE property_images (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  image_url VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Amenities table
CREATE TABLE amenities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Property amenities junction table
CREATE TABLE property_amenities (
  property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  amenity_id INTEGER REFERENCES amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, amenity_id)
);

-- Bookings table
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews table
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Amenities table is ready for data insertion via API
