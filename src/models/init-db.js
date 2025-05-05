const fs = require('fs');
const path = require('path');
const sql = require('mssql');
require('dotenv').config();

async function createDatabase() {
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
      connectTimeout: 30000 // Increase timeout to 30 seconds
    },
    connectionTimeout: 30000, // Increase connection timeout
    requestTimeout: 30000 // Increase request timeout
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

    // Check if airbnb database already exists
    const checkResult = await sql.query`
      SELECT name FROM sys.databases WHERE name = 'airbnb'
    `;

    if (checkResult.recordset.length > 0) {
      console.log('Database "airbnb" already exists, skipping creation');
      await sql.close();
      return true;
    }

    // Create the database only if it doesn't exist
    await sql.query`
      CREATE DATABASE airbnb;
    `;
    console.log('Database "airbnb" created successfully');

    await sql.close();
    return true;
  } catch (error) {
    console.error('Error creating database:', error);
    try {
      await sql.close();
    } catch (err) {
      // Ignore error on close
    }
    return false;
  }
}

async function initializeSchema() {
  // Configuration to connect to airbnb database
  const airbnbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'Admin@123',
    server: process.env.DB_HOST || 'localhost',
    database: 'airbnb',
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectTimeout: 30000 // Increase timeout to 30 seconds
    },
    connectionTimeout: 30000, // Increase connection timeout
    requestTimeout: 30000 // Increase request timeout
  };

  try {
    // Connect to airbnb database
    await sql.connect(airbnbConfig);

    // Check if schema is already initialized by looking for the users table
    const tableCheck = await sql.query`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME = 'users'
    `;

    if (tableCheck.recordset.length > 0) {
      console.log('Schema already initialized, skipping initialization');
      await sql.close();
      return true;
    }

    // Read the schema SQL file
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'mssql-schema.sql'),
      'utf8'
    );

    // Split the SQL into individual statements (SQL Server uses GO as a batch separator)
    const statements = schemaSQL
      .split('GO')
      .filter(statement => statement.trim() !== '');

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim() !== '') {
        await sql.query(statement);
      }
    }

    console.log('Schema initialized successfully');
    await sql.close();
    return true;
  } catch (error) {
    console.error('Error initializing schema:', error);
    try {
      await sql.close();
    } catch (err) {
      // Ignore error on close
    }
    return false;
  }
}

async function initializeDatabase() {
  const maxRetries = 5;
  let retryCount = 0;
  let success = false;

  while (retryCount < maxRetries && !success) {
    try {
      console.log(`Attempt ${retryCount + 1} of ${maxRetries} to initialize database`);

      const dbCreated = await createDatabase();
      if (dbCreated) {
        const schemaInitialized = await initializeSchema();
        if (schemaInitialized) {
          console.log('Database initialization completed successfully');
          success = true;
        }
      }

      if (!success) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`Retrying in 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    } catch (error) {
      console.error(`Attempt ${retryCount + 1} failed:`, error);
      retryCount++;

      if (retryCount < maxRetries) {
        console.log(`Retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('All retry attempts failed');
        process.exit(1);
      }
    }
  }

  if (success) {
    process.exit(0);
  } else {
    console.error('Database initialization failed after all retry attempts');
    process.exit(1);
  }
}

initializeDatabase();
