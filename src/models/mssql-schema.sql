-- Schema for Airbnb database in SQL Server

-- Users table
CREATE TABLE Users (
    user_ID INT PRIMARY KEY,
    password VARCHAR(255),
    name VARCHAR(255),
    email VARCHAR(255),
    address VARCHAR(255),
    phone_No VARCHAR(20)
);

-- Insert sample users
INSERT INTO Users (user_ID, password, name, email, address, phone_No) VALUES
    (1, 'password123', 'John Doe', 'john@example.com', '123 Main St', '555-1234'),
    (2, 'securepass', 'Jane Smith', 'jane@example.com', '456 Oak Ave', '555-5678'),
    (3, 'userpass', 'Bob Johnson', 'bob@example.com', '789 Pine Rd', '555-9012');

-- Select all users
SELECT * FROM Users;

-- Properties table
CREATE TABLE Properties (
    property_id INT PRIMARY KEY,
    user_id INT,
    property_type VARCHAR(50),
    rent_per_day DECIMAL(10, 2),
    address VARCHAR(255),
    rating DECIMAL(3, 2),
    city VARCHAR(100),
    longitude DECIMAL(9, 6),
    latitude DECIMAL(9, 6),
    title VARCHAR(100),
    description VARCHAR(100),
    guest INT,
    FOREIGN KEY (user_id) REFERENCES Users(user_ID)
);

-- Insert sample properties
INSERT INTO Properties (property_id, user_id, property_type, rent_per_day, address, rating, city, longitude, latitude, title, description, guest) VALUES
    (1, 1, 'House', 150.00, '123 Beach Rd', 4.5, 'Miami', -80.191788, 25.761681, 'Beach House', 'Beautiful house near the beach', 4),
    (2, 2, 'Apartment', 100.00, '456 Downtown St', 4.2, 'New York', -73.935242, 40.730610, 'City Apartment', 'Modern apartment in downtown', 2),
    (3, 1, 'Room', 50.00, '789 College Ave', 3.8, 'Boston', -71.058880, 42.360082, 'Cozy Room', 'Comfortable room for students', 1);

-- Select all properties
SELECT * FROM Properties;

-- Pictures table
CREATE TABLE Pictures (
    picture_id INT PRIMARY KEY IDENTITY(1,1),
    property_id INT,
    image_url VARCHAR(255),
    FOREIGN KEY (property_id) REFERENCES Properties(property_id)
);

-- Insert sample pictures
INSERT INTO Pictures (property_id, image_url) VALUES
    (1, 'images/property1_1.jpg'),
    (1, 'images/property1_2.jpg'),
    (2, 'images/property2_1.jpg'),
    (3, 'images/property3_1.jpg');

-- Select all pictures
SELECT * FROM Pictures;

-- Booking table
CREATE TABLE Booking (
    booking_id INT PRIMARY KEY,
    user_ID INT,
    property_id INT,
    status VARCHAR(50),
    booking_date DATE,
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (user_ID) REFERENCES Users(user_ID),
    FOREIGN KEY (property_id) REFERENCES Properties(property_id)
);

-- Insert sample bookings
INSERT INTO Booking (booking_id, user_ID, property_id, status, booking_date, start_date, end_date) VALUES
    (1, 3, 1, 'Confirmed', '2023-05-01', '2023-06-10', '2023-06-15'),
    (2, 2, 3, 'Pending', '2023-05-05', '2023-07-01', '2023-07-05'),
    (3, 3, 2, 'Completed', '2023-04-10', '2023-04-20', '2023-04-25');

-- Select all bookings
SELECT * FROM Booking;

-- Booking Review table
CREATE TABLE Booking_Review (
    booking_id INT PRIMARY KEY,
    user_ID INT,
    property_id INT,
    user_rating DECIMAL(3, 2),
    user_review TEXT,
    owner_rating DECIMAL(3, 2),
    owner_review TEXT,
    property_rating DECIMAL(3, 2),
    property_review TEXT,
    FOREIGN KEY (booking_id) REFERENCES Booking(booking_id),
    FOREIGN KEY (user_ID) REFERENCES Users(user_ID),
    FOREIGN KEY (property_id) REFERENCES Properties(property_id)
);

-- Insert sample booking reviews
INSERT INTO Booking_Review (booking_id, user_ID, property_id, user_rating, user_review, owner_rating, owner_review, property_rating, property_review) VALUES
    (1, 3, 1, 4.5, 'Great guest!', 4.8, 'Excellent host', 4.7, 'Beautiful property, would stay again'),
    (3, 3, 2, 4.0, 'Good guest', 4.2, 'Nice host', 4.5, 'Clean and comfortable');

-- Select all booking reviews
SELECT * FROM Booking_Review;

-- Facilities table
CREATE TABLE Facilities (
    facility_id INT PRIMARY KEY,
    facility_type VARCHAR(100)
);

-- Insert sample facilities
INSERT INTO Facilities (facility_id, facility_type) VALUES
    (1, 'WiFi'),
    (2, 'Pool'),
    (3, 'Gym'),
    (4, 'Parking'),
    (5, 'Air Conditioning');

-- Select all facilities
SELECT * FROM Facilities;

-- House table
CREATE TABLE House (
    property_id INT PRIMARY KEY,
    total_bedrooms INT,
    FOREIGN KEY (property_id) REFERENCES Properties(property_id)
);

-- Insert sample houses
INSERT INTO House (property_id, total_bedrooms) VALUES
    (1, 3);

-- Select all houses
SELECT * FROM House;

-- Flat table
CREATE TABLE Flat (
    property_id INT PRIMARY KEY,
    total_rooms INT,
    FOREIGN KEY (property_id) REFERENCES Properties(property_id)
);

-- Insert sample flats
INSERT INTO Flat (property_id, total_rooms) VALUES
    (2, 2);

-- Select all flats
SELECT * FROM Flat;

-- Room table
CREATE TABLE Room (
    property_id INT PRIMARY KEY,
    total_beds INT,
    FOREIGN KEY (property_id) REFERENCES Properties(property_id)
);

-- Insert sample rooms
INSERT INTO Room (property_id, total_beds) VALUES
    (3, 1);

-- Select all rooms
SELECT * FROM Room;

-- Property Facilities junction table
CREATE TABLE Property_Facilities (
    property_id INT,
    facility_id INT,
    PRIMARY KEY (property_id, facility_id),
    FOREIGN KEY (property_id) REFERENCES Properties(property_id),
    FOREIGN KEY (facility_id) REFERENCES Facilities(facility_id)
);

-- Insert sample property facilities
INSERT INTO Property_Facilities (property_id, facility_id) VALUES
    (1, 1),
    (1, 2),
    (2, 1),
    (2, 5),
    (3, 1),
    (3, 4);

-- Select all property facilities
SELECT * FROM Property_Facilities;

-- Property Facility Rating table
CREATE TABLE Property_Facility_Rating (
    property_id INT,
    user_ID INT,
    facility_id INT,
    rating DECIMAL(3, 2),
    review TEXT,
    PRIMARY KEY (property_id, user_ID, facility_id),
    FOREIGN KEY (property_id) REFERENCES Properties(property_id),
    FOREIGN KEY (user_ID) REFERENCES Users(user_ID),
    FOREIGN KEY (facility_id) REFERENCES Facilities(facility_id)
);

-- Insert sample property facility ratings
INSERT INTO Property_Facility_Rating (property_id, user_ID, facility_id, rating, review) VALUES
    (1, 3, 1, 4.5, 'Great WiFi speed'),
    (1, 3, 2, 4.8, 'Clean pool'),
    (2, 3, 1, 3.5, 'WiFi was a bit slow'),
    (2, 3, 5, 5.0, 'Excellent air conditioning');

-- Select all property facility ratings
SELECT * FROM Property_Facility_Rating;
