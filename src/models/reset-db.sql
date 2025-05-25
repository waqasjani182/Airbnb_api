-- Reset and recreate the Airbnb database with the new schema

-- Create the database if it doesn't exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'airbnb')
BEGIN
    CREATE DATABASE airbnb;
END

-- Use the database
USE airbnb;

-- Drop all existing tables if they exist
IF OBJECT_ID('Property_Facility_Rating', 'U') IS NOT NULL DROP TABLE Property_Facility_Rating;
IF OBJECT_ID('Property_Facilities', 'U') IS NOT NULL DROP TABLE Property_Facilities;
IF OBJECT_ID('Room', 'U') IS NOT NULL DROP TABLE Room;
IF OBJECT_ID('Flat', 'U') IS NOT NULL DROP TABLE Flat;
IF OBJECT_ID('House', 'U') IS NOT NULL DROP TABLE House;
IF OBJECT_ID('Booking_Review', 'U') IS NOT NULL DROP TABLE Booking_Review;
IF OBJECT_ID('Booking', 'U') IS NOT NULL DROP TABLE Booking;
IF OBJECT_ID('Pictures', 'U') IS NOT NULL DROP TABLE Pictures;
IF OBJECT_ID('Properties', 'U') IS NOT NULL DROP TABLE Properties;
IF OBJECT_ID('Facilities', 'U') IS NOT NULL DROP TABLE Facilities;
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;

-- Users table
CREATE TABLE Users (
    user_ID INT PRIMARY KEY,
    password VARCHAR(255),
    name VARCHAR(255),
    email VARCHAR(255),
    address VARCHAR(255),
    phone_No VARCHAR(20)
);

-- Users table is ready for data insertion via API

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

-- Properties table is ready for data insertion via API

-- Pictures table
CREATE TABLE Pictures (
    picture_id INT PRIMARY KEY IDENTITY(1,1),
    property_id INT,
    image_url VARCHAR(255),
    FOREIGN KEY (property_id) REFERENCES Properties(property_id)
);

-- Pictures table is ready for data insertion via API

-- Booking table
CREATE TABLE Booking (
    booking_id INT PRIMARY KEY,
    user_ID INT,
    property_id INT,
    status VARCHAR(50),
    booking_date DATE,
    start_date DATE,
    end_date DATE,
    total_amount DECIMAL(10, 2),
    guests INT,
    FOREIGN KEY (user_ID) REFERENCES Users(user_ID),
    FOREIGN KEY (property_id) REFERENCES Properties(property_id)
);

-- Booking table is ready for data insertion via API

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

-- Booking_Review table is ready for data insertion via API

-- Facilities table
CREATE TABLE Facilities (
    facility_id INT PRIMARY KEY,
    facility_type VARCHAR(100)
);

-- Facilities table is ready for data insertion via API

-- House table
CREATE TABLE House (
    property_id INT PRIMARY KEY,
    total_bedrooms INT,
    FOREIGN KEY (property_id) REFERENCES Properties(property_id)
);

-- House table is ready for data insertion via API

-- Flat table
CREATE TABLE Flat (
    property_id INT PRIMARY KEY,
    total_rooms INT,
    FOREIGN KEY (property_id) REFERENCES Properties(property_id)
);

-- Flat table is ready for data insertion via API

-- Room table
CREATE TABLE Room (
    property_id INT PRIMARY KEY,
    total_beds INT,
    FOREIGN KEY (property_id) REFERENCES Properties(property_id)
);

-- Room table is ready for data insertion via API

-- Property Facilities junction table
CREATE TABLE Property_Facilities (
    property_id INT,
    facility_id INT,
    PRIMARY KEY (property_id, facility_id),
    FOREIGN KEY (property_id) REFERENCES Properties(property_id),
    FOREIGN KEY (facility_id) REFERENCES Facilities(facility_id)
);

-- Property_Facilities table is ready for data insertion via API

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

-- Property_Facility_Rating table is ready for data insertion via API
