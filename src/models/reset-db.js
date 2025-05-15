const sql = require('mssql');
require('dotenv').config();

// Use environment variables for timeouts or fallback to higher values for Windows
const connectionTimeout = parseInt(process.env.MSSQL_CONNECTION_TIMEOUT || '60000');
const requestTimeout = parseInt(process.env.MSSQL_REQUEST_TIMEOUT || '60000');

async function resetDatabase() {
  // Configuration to connect to master database
  const masterConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'Admin@123',
    server: process.env.DB_HOST || 'localhost',
    database: 'master',
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectTimeout: connectionTimeout
    },
    connectionTimeout: connectionTimeout,
    requestTimeout: requestTimeout,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: connectionTimeout
    }
  };

  console.log('Attempting to connect to SQL Server with config:', {
    user: masterConfig.user,
    server: masterConfig.server,
    database: masterConfig.database,
    port: masterConfig.port
  });

  try {
    // Connect to master database
    await sql.connect(masterConfig);

    // Check if airbnb database exists
    const checkResult = await sql.query`
      SELECT name FROM sys.databases WHERE name = 'airbnb'
    `;

    // If database exists, drop it
    if (checkResult.recordset.length > 0) {
      console.log('Database "airbnb" exists, dropping it...');
      await sql.query`
        ALTER DATABASE airbnb SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
        DROP DATABASE airbnb;
      `;
      console.log('Database "airbnb" dropped successfully');
    }

    // Create the database
    await sql.query`
      CREATE DATABASE airbnb;
    `;
    console.log('Database "airbnb" created successfully');

    // Close the connection to master
    await sql.close();

    // Connect to airbnb database
    const airbnbConfig = {
      user: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || 'Admin@123',
      server: process.env.DB_HOST || 'localhost',
      database: 'airbnb',
      port: parseInt(process.env.DB_PORT || '1433'),
      options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: connectionTimeout
      },
      connectionTimeout: connectionTimeout,
      requestTimeout: requestTimeout,
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: connectionTimeout
      }
    };

    await sql.connect(airbnbConfig);
    console.log('Connected to airbnb database');

    // Create tables and insert data
    console.log('Creating tables and inserting data...');

    // Users table
    await sql.query`
      CREATE TABLE Users (
        user_ID INT PRIMARY KEY,
        password VARCHAR(255),
        name VARCHAR(255),
        email VARCHAR(255),
        address VARCHAR(255),
        phone_No VARCHAR(20),
        profile_image VARCHAR(255)
      );
    `;
    console.log('Created Users table');

    // Insert sample users
    await sql.query`
      INSERT INTO Users (user_ID, password, name, email, address, phone_No, profile_image) VALUES
        (1, 'password123', 'John Doe', 'john@example.com', '123 Main St', '555-1234', 'http://localhost:3004/uploads/profile-images/default-profile.jpg'),
        (2, 'securepass', 'Jane Smith', 'jane@example.com', '456 Oak Ave', '555-5678', 'http://localhost:3004/uploads/profile-images/default-profile.jpg'),
        (3, 'userpass', 'Bob Johnson', 'bob@example.com', '789 Pine Rd', '555-9012', 'http://localhost:3004/uploads/profile-images/default-profile.jpg');
    `;
    console.log('Inserted sample users');

    // Properties table
    await sql.query`
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
    `;
    console.log('Created Properties table');

    // Insert sample properties
    await sql.query`
      INSERT INTO Properties (property_id, user_id, property_type, rent_per_day, address, rating, city, longitude, latitude, title, description, guest) VALUES
        (1, 1, 'House', 150.00, '123 Beach Rd', 4.5, 'Miami', -80.191788, 25.761681, 'Beach House', 'Beautiful house near the beach', 4),
        (2, 2, 'Apartment', 100.00, '456 Downtown St', 4.2, 'New York', -73.935242, 40.730610, 'City Apartment', 'Modern apartment in downtown', 2),
        (3, 1, 'Room', 50.00, '789 College Ave', 3.8, 'Boston', -71.058880, 42.360082, 'Cozy Room', 'Comfortable room for students', 1);
    `;
    console.log('Inserted sample properties');

    // Pictures table
    await sql.query`
      CREATE TABLE Pictures (
        picture_id INT PRIMARY KEY IDENTITY(1,1),
        property_id INT,
        image_url VARCHAR(255),
        FOREIGN KEY (property_id) REFERENCES Properties(property_id)
      );
    `;
    console.log('Created Pictures table');

    // Insert sample pictures
    await sql.query`
      INSERT INTO Pictures (property_id, image_url) VALUES
        (1, 'images/property1_1.jpg'),
        (1, 'images/property1_2.jpg'),
        (2, 'images/property2_1.jpg'),
        (3, 'images/property3_1.jpg');
    `;
    console.log('Inserted sample pictures');

    // Facilities table
    await sql.query`
      CREATE TABLE Facilities (
        facility_id INT PRIMARY KEY,
        facility_type VARCHAR(100)
      );
    `;
    console.log('Created Facilities table');

    // Insert sample facilities
    await sql.query`
      INSERT INTO Facilities (facility_id, facility_type) VALUES
        (1, 'WiFi'),
        (2, 'Pool'),
        (3, 'Gym'),
        (4, 'Parking'),
        (5, 'Air Conditioning');
    `;
    console.log('Inserted sample facilities');

    // Booking table
    await sql.query`
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
    `;
    console.log('Created Booking table');

    // Insert sample bookings
    await sql.query`
      INSERT INTO Booking (booking_id, user_ID, property_id, status, booking_date, start_date, end_date) VALUES
        (1, 3, 1, 'Confirmed', '2023-05-01', '2023-06-10', '2023-06-15'),
        (2, 2, 3, 'Pending', '2023-05-05', '2023-07-01', '2023-07-05'),
        (3, 3, 2, 'Completed', '2023-04-10', '2023-04-20', '2023-04-25');
    `;
    console.log('Inserted sample bookings');

    // Booking Review table
    await sql.query`
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
    `;
    console.log('Created Booking_Review table');

    // Insert sample booking reviews
    await sql.query`
      INSERT INTO Booking_Review (booking_id, user_ID, property_id, user_rating, user_review, owner_rating, owner_review, property_rating, property_review) VALUES
        (1, 3, 1, 4.5, 'Great guest!', 4.8, 'Excellent host', 4.7, 'Beautiful property, would stay again'),
        (3, 3, 2, 4.0, 'Good guest', 4.2, 'Nice host', 4.5, 'Clean and comfortable');
    `;
    console.log('Inserted sample booking reviews');

    // House table
    await sql.query`
      CREATE TABLE House (
        property_id INT PRIMARY KEY,
        total_bedrooms INT,
        FOREIGN KEY (property_id) REFERENCES Properties(property_id)
      );
    `;
    console.log('Created House table');

    // Insert sample houses
    await sql.query`
      INSERT INTO House (property_id, total_bedrooms) VALUES
        (1, 3);
    `;
    console.log('Inserted sample houses');

    // Flat table
    await sql.query`
      CREATE TABLE Flat (
        property_id INT PRIMARY KEY,
        total_rooms INT,
        FOREIGN KEY (property_id) REFERENCES Properties(property_id)
      );
    `;
    console.log('Created Flat table');

    // Insert sample flats
    await sql.query`
      INSERT INTO Flat (property_id, total_rooms) VALUES
        (2, 2);
    `;
    console.log('Inserted sample flats');

    // Room table
    await sql.query`
      CREATE TABLE Room (
        property_id INT PRIMARY KEY,
        total_beds INT,
        FOREIGN KEY (property_id) REFERENCES Properties(property_id)
      );
    `;
    console.log('Created Room table');

    // Insert sample rooms
    await sql.query`
      INSERT INTO Room (property_id, total_beds) VALUES
        (3, 1);
    `;
    console.log('Inserted sample rooms');

    // Property Facilities junction table
    await sql.query`
      CREATE TABLE Property_Facilities (
        property_id INT,
        facility_id INT,
        PRIMARY KEY (property_id, facility_id),
        FOREIGN KEY (property_id) REFERENCES Properties(property_id),
        FOREIGN KEY (facility_id) REFERENCES Facilities(facility_id)
      );
    `;
    console.log('Created Property_Facilities table');

    // Insert sample property facilities
    await sql.query`
      INSERT INTO Property_Facilities (property_id, facility_id) VALUES
        (1, 1),
        (1, 2),
        (2, 1),
        (2, 5),
        (3, 1),
        (3, 4);
    `;
    console.log('Inserted sample property facilities');

    // Property Facility Rating table
    await sql.query`
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
    `;
    console.log('Created Property_Facility_Rating table');

    // Insert sample property facility ratings
    await sql.query`
      INSERT INTO Property_Facility_Rating (property_id, user_ID, facility_id, rating, review) VALUES
        (1, 3, 1, 4.5, 'Great WiFi speed'),
        (1, 3, 2, 4.8, 'Clean pool'),
        (2, 3, 1, 3.5, 'WiFi was a bit slow'),
        (2, 3, 5, 5.0, 'Excellent air conditioning');
    `;
    console.log('Inserted sample property facility ratings');

    console.log('Database reset and recreated successfully');
    await sql.close();
    return true;
  } catch (error) {
    console.error('Error resetting database:', error);
    try {
      await sql.close();
    } catch (err) {
      // Ignore error on close
    }
    return false;
  }
}

async function main() {
  const maxRetries = 5;
  let retryCount = 0;
  let success = false;

  console.log('Starting database reset with the following settings:');
  console.log(`- Connection timeout: ${connectionTimeout}ms`);
  console.log(`- Request timeout: ${requestTimeout}ms`);
  console.log(`- Max retries: ${maxRetries}`);

  while (retryCount < maxRetries && !success) {
    try {
      console.log(`Attempt ${retryCount + 1} of ${maxRetries} to reset database`);

      success = await resetDatabase();

      if (!success) {
        retryCount++;
        if (retryCount < maxRetries) {
          const waitTime = 10000; // Wait 10 seconds before retrying
          console.log(`Retrying in ${waitTime/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    } catch (error) {
      console.error(`Attempt ${retryCount + 1} failed:`, error);
      retryCount++;

      if (retryCount < maxRetries) {
        const waitTime = 10000; // Wait 10 seconds before retrying
        console.log(`Retrying in ${waitTime/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error('All retry attempts failed');
        process.exit(1);
      }
    }
  }

  if (success) {
    console.log('Database reset completed successfully');
    process.exit(0);
  } else {
    console.error('Database reset failed after all retry attempts');
    process.exit(1);
  }
}

main();
