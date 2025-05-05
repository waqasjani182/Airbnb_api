-- Schema for Airbnb database in SQL Server

-- Users table
CREATE TABLE users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  first_name NVARCHAR(100) NOT NULL,
  last_name NVARCHAR(100) NOT NULL,
  email NVARCHAR(255) NOT NULL UNIQUE,
  password NVARCHAR(255) NOT NULL,
  phone NVARCHAR(20) NULL,
  profile_image NVARCHAR(255) NULL,
  is_host BIT DEFAULT 0,
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE()
);

-- Properties table
CREATE TABLE properties (
  id INT IDENTITY(1,1) PRIMARY KEY,
  host_id INT NOT NULL,
  title NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX) NOT NULL,
  address NVARCHAR(255) NOT NULL,
  city NVARCHAR(100) NOT NULL,
  state NVARCHAR(100) NULL,
  country NVARCHAR(100) NOT NULL,
  zip_code NVARCHAR(20) NULL,
  latitude DECIMAL(10, 8) NULL,
  longitude DECIMAL(11, 8) NULL,
  price_per_night DECIMAL(10, 2) NOT NULL,
  bedrooms INT NOT NULL,
  bathrooms INT NOT NULL,
  max_guests INT NOT NULL,
  property_type NVARCHAR(50) NOT NULL,
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  CONSTRAINT FK_Properties_Users FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Property images table
CREATE TABLE property_images (
  id INT IDENTITY(1,1) PRIMARY KEY,
  property_id INT NOT NULL,
  image_url NVARCHAR(255) NOT NULL,
  is_primary BIT DEFAULT 0,
  created_at DATETIME DEFAULT GETDATE(),
  CONSTRAINT FK_PropertyImages_Properties FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Amenities table
CREATE TABLE amenities (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  icon NVARCHAR(100) NULL,
  created_at DATETIME DEFAULT GETDATE()
);

-- Property amenities junction table
CREATE TABLE property_amenities (
  property_id INT NOT NULL,
  amenity_id INT NOT NULL,
  PRIMARY KEY (property_id, amenity_id),
  CONSTRAINT FK_PropertyAmenities_Properties FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT FK_PropertyAmenities_Amenities FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
);

-- Bookings table
CREATE TABLE bookings (
  id INT IDENTITY(1,1) PRIMARY KEY,
  property_id INT NOT NULL,
  guest_id INT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status NVARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  CONSTRAINT FK_Bookings_Properties FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT FK_Bookings_Users FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE NO ACTION
);

-- Reviews table
CREATE TABLE reviews (
  id INT IDENTITY(1,1) PRIMARY KEY,
  booking_id INT NOT NULL,
  property_id INT NOT NULL,
  guest_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment NVARCHAR(MAX) NULL,
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  CONSTRAINT FK_Reviews_Bookings FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT FK_Reviews_Properties FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE NO ACTION,
  CONSTRAINT FK_Reviews_Users FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE NO ACTION
);

-- Messages table
CREATE TABLE messages (
  id INT IDENTITY(1,1) PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  booking_id INT NULL,
  content NVARCHAR(MAX) NOT NULL,
  is_read BIT DEFAULT 0,
  created_at DATETIME DEFAULT GETDATE(),
  CONSTRAINT FK_Messages_Sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE NO ACTION,
  CONSTRAINT FK_Messages_Receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE NO ACTION,
  CONSTRAINT FK_Messages_Bookings FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- Insert some default amenities
INSERT INTO amenities (name, icon) VALUES
  ('WiFi', 'wifi'),
  ('Air Conditioning', 'ac'),
  ('Heating', 'heating'),
  ('Kitchen', 'kitchen'),
  ('TV', 'tv'),
  ('Washer', 'washer'),
  ('Dryer', 'dryer'),
  ('Free Parking', 'parking'),
  ('Pool', 'pool'),
  ('Hot Tub', 'hot-tub'),
  ('Gym', 'gym'),
  ('Workspace', 'workspace');
