const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function createDatabase() {
  const pgConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres', // Connect to default postgres database
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  };

  const pgPool = new Pool(pgConfig);

  try {
    // Check if airbnb database already exists
    const checkResult = await pgPool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'airbnb'"
    );

    if (checkResult.rows.length === 0) {
      // Create airbnb database if it doesn't exist
      await pgPool.query('CREATE DATABASE airbnb');
      console.log('Database "airbnb" created successfully');
    } else {
      console.log('Database "airbnb" already exists');
    }

    await pgPool.end();
    return true;
  } catch (error) {
    console.error('Error creating database:', error);
    await pgPool.end();
    return false;
  }
}

async function initializeSchema() {
  const airbnbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'airbnb', // Connect to airbnb database
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  };

  const airbnbPool = new Pool(airbnbConfig);

  try {
    // Read the schema SQL file
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf8'
    );

    // Split the SQL into individual statements
    const statements = schemaSQL
      .split(';')
      .filter(statement => statement.trim() !== '')
      .map(statement => statement + ';');

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim() !== '') {
        await airbnbPool.query(statement);
      }
    }

    console.log('Schema initialized successfully');
    await airbnbPool.end();
    return true;
  } catch (error) {
    console.error('Error initializing schema:', error);
    await airbnbPool.end();
    return false;
  }
}

async function initializeDatabase() {
  try {
    const dbCreated = await createDatabase();
    if (dbCreated) {
      const schemaInitialized = await initializeSchema();
      if (schemaInitialized) {
        console.log('Database initialization completed successfully');
      }
    }
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();
