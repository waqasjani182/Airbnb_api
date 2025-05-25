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

    // Users table is ready for data insertion via API
    console.log('Users table created and ready for data');

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

    // Properties table is ready for data insertion via API
    console.log('Properties table created and ready for data');

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

    // Pictures table is ready for data insertion via API
    console.log('Pictures table created and ready for data');

    // Facilities table
    await sql.query`
      CREATE TABLE Facilities (
        facility_id INT PRIMARY KEY,
        facility_type VARCHAR(100)
      );
    `;
    console.log('Created Facilities table');

    // Facilities table is ready for data insertion via API
    console.log('Facilities table created and ready for data');

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
        total_amount DECIMAL(10, 2),
        guests INT,
        FOREIGN KEY (user_ID) REFERENCES Users(user_ID),
        FOREIGN KEY (property_id) REFERENCES Properties(property_id)
      );
    `;
    console.log('Created Booking table');

    // Booking table is ready for data insertion via API
    console.log('Booking table created and ready for data');

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

    // Booking_Review table is ready for data insertion via API
    console.log('Booking_Review table created and ready for data');

    // House table
    await sql.query`
      CREATE TABLE House (
        property_id INT PRIMARY KEY,
        total_bedrooms INT,
        FOREIGN KEY (property_id) REFERENCES Properties(property_id)
      );
    `;
    console.log('Created House table');

    // House table is ready for data insertion via API
    console.log('House table created and ready for data');

    // Flat table
    await sql.query`
      CREATE TABLE Flat (
        property_id INT PRIMARY KEY,
        total_rooms INT,
        FOREIGN KEY (property_id) REFERENCES Properties(property_id)
      );
    `;
    console.log('Created Flat table');

    // Flat table is ready for data insertion via API
    console.log('Flat table created and ready for data');

    // Room table
    await sql.query`
      CREATE TABLE Room (
        property_id INT PRIMARY KEY,
        total_beds INT,
        FOREIGN KEY (property_id) REFERENCES Properties(property_id)
      );
    `;
    console.log('Created Room table');

    // Room table is ready for data insertion via API
    console.log('Room table created and ready for data');

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

    // Property_Facilities table is ready for data insertion via API
    console.log('Property_Facilities table created and ready for data');

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

    // Property_Facility_Rating table is ready for data insertion via API
    console.log('Property_Facility_Rating table created and ready for data');

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
