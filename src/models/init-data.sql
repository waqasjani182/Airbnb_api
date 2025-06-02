-- Initialize database with admin user and sample facilities

-- Insert admin user
INSERT INTO Users (user_ID, password, name, email, address, phone_No, profile_image, is_admin)
VALUES (1, 'admin123', 'Administrator', 'admin@admin.com', 'Admin Office', '1234567890', NULL, 1);

-- Insert sample users
INSERT INTO Users (user_ID, password, name, email, address, phone_No, profile_image, is_admin)
VALUES 
(2, 'password123', 'John Doe', 'john@example.com', '123 Main St', '555-1234', 'http://localhost:3004/uploads/profile-images/default-profile.jpg', 0),
(3, 'password123', 'Jane Smith', 'jane@example.com', '456 Oak Ave', '555-5678', 'http://localhost:3004/uploads/profile-images/default-profile.jpg', 0),
(4, 'password123', 'Bob Johnson', 'bob@example.com', '789 Pine Rd', '555-9012', 'http://localhost:3004/uploads/profile-images/default-profile.jpg', 0);

-- Insert sample facilities
INSERT INTO Facilities (facility_id, facility_type)
VALUES 
(1, 'WiFi'),
(2, 'Air Conditioning'),
(3, 'Heating'),
(4, 'Kitchen'),
(5, 'Washing Machine'),
(6, 'TV'),
(7, 'Parking'),
(8, 'Pool'),
(9, 'Gym'),
(10, 'Balcony'),
(11, 'Garden'),
(12, 'Fireplace'),
(13, 'Hot Tub'),
(14, 'BBQ Grill'),
(15, 'Elevator'),
(16, 'Wheelchair Accessible'),
(17, 'Pet Friendly'),
(18, 'Smoking Allowed'),
(19, 'Family Friendly'),
(20, 'Business Center');

-- Insert sample properties
INSERT INTO Properties (property_id, user_id, property_type, rent_per_day, address, rating, city, longitude, latitude, title, description, guest)
VALUES 
(1, 2, 'House', 150.00, '123 Beach Road', 4.5, 'Miami', -80.1918, 25.7617, 'Beautiful Beach House', 'Stunning oceanfront property with amazing views', 6),
(2, 3, 'Flat', 80.00, '456 City Center', 4.2, 'New York', -74.0060, 40.7128, 'Modern City Apartment', 'Stylish apartment in the heart of the city', 4),
(3, 4, 'Room', 45.00, '789 University Ave', 4.0, 'Boston', -71.0589, 42.3601, 'Cozy Student Room', 'Perfect for students and young professionals', 2);

-- Insert sample property images
INSERT INTO Pictures (property_id, image_url)
VALUES 
(1, 'http://localhost:3004/uploads/property-images/beach-house-1.jpg'),
(1, 'http://localhost:3004/uploads/property-images/beach-house-2.jpg'),
(2, 'http://localhost:3004/uploads/property-images/city-apartment-1.jpg'),
(2, 'http://localhost:3004/uploads/property-images/city-apartment-2.jpg'),
(3, 'http://localhost:3004/uploads/property-images/student-room-1.jpg');

-- Insert sample property facilities
INSERT INTO Property_Facilities (property_id, facility_id)
VALUES 
-- Beach House facilities
(1, 1), (1, 2), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 10), (1, 11), (1, 14),
-- City Apartment facilities  
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6), (2, 15), (2, 19),
-- Student Room facilities
(3, 1), (3, 3), (3, 6), (3, 17), (3, 19);

-- Insert sample bookings
INSERT INTO Booking (booking_id, user_ID, property_id, status, booking_date, start_date, end_date, total_amount, guests)
VALUES 
(1, 3, 1, 'Confirmed', '2024-01-15', '2024-02-01', '2024-02-05', 600.00, 4),
(2, 2, 3, 'Pending', '2024-01-20', '2024-02-10', '2024-02-15', 225.00, 2),
(3, 4, 2, 'Completed', '2024-01-10', '2024-01-25', '2024-01-30', 400.00, 3);

-- Insert sample reviews
INSERT INTO Booking_Review (booking_id, user_ID, property_id, user_rating, user_review, owner_rating, owner_review, property_rating, property_review)
VALUES 
(3, 4, 2, 4.5, 'Great stay! Very clean and comfortable.', 4.0, 'Nice guest, very respectful.', 4.2, 'Perfect location and amenities.');

-- Insert property type specific details
INSERT INTO House (property_id, total_bedrooms)
VALUES (1, 3);

INSERT INTO Flat (property_id, total_rooms)
VALUES (2, 2);

INSERT INTO Room (property_id, total_beds)
VALUES (3, 1);

PRINT 'Sample data inserted successfully';
