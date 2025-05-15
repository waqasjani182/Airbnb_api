const fs = require('fs');
const path = require('path');
const sql = require('mssql');
require('dotenv').config();

// Use environment variables for timeouts or fallback to higher values for Windows
const connectionTimeout = parseInt(process.env.MSSQL_CONNECTION_TIMEOUT || '60000');
const requestTimeout = parseInt(process.env.MSSQL_REQUEST_TIMEOUT || '60000');

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

  try {
    // Connect to airbnb database
    await sql.connect(airbnbConfig);

    // Drop all existing tables to ensure clean schema
    console.log('Dropping existing tables to ensure clean schema...');

    // Disable foreign key constraints
    await sql.query`
      EXEC sp_MSforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT all"
    `;

    // Get all table names
    const tables = await sql.query`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = 'dbo'
    `;

    // Drop each table
    for (const table of tables.recordset) {
      try {
        await sql.query`
          DROP TABLE [${table.TABLE_NAME}]
        `;
        console.log(`Dropped table: ${table.TABLE_NAME}`);
      } catch (err) {
        console.log(`Error dropping table ${table.TABLE_NAME}: ${err.message}`);
      }
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
  const maxRetries = 10; // Increase max retries for Windows
  let retryCount = 0;
  let success = false;

  console.log('Starting database initialization with the following settings:');
  console.log(`- Connection timeout: ${connectionTimeout}ms`);
  console.log(`- Request timeout: ${requestTimeout}ms`);
  console.log(`- Max retries: ${maxRetries}`);

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
          const waitTime = 10000; // Increase wait time to 10 seconds for Windows
          console.log(`Retrying in ${waitTime/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    } catch (error) {
      console.error(`Attempt ${retryCount + 1} failed:`, error);
      retryCount++;

      if (retryCount < maxRetries) {
        const waitTime = 10000; // Increase wait time to 10 seconds for Windows
        console.log(`Retrying in ${waitTime/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
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
