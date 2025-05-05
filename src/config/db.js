const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Admin@123',
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'airbnb',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: false, // For Azure use true
    trustServerCertificate: true, // For local dev / self-signed certs
    connectTimeout: 30000 // Increase timeout to 30 seconds
  },
  connectionTimeout: 30000, // Increase connection timeout
  requestTimeout: 30000, // Increase request timeout
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000 // Increase acquire timeout
  }
};

// Create a connection pool
const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

// Test the connection
poolConnect.then(() => {
  console.log('SQL Server connected successfully');
}).catch(err => {
  console.error('SQL Server connection error:', err);
});

// Store active transactions
const transactions = new Map();

// Query function that uses the connection pool
async function query(text, params = []) {
  try {
    await poolConnect; // Ensures that the pool has been created

    const request = pool.request();

    // Add parameters to the request
    if (params && Array.isArray(params)) {
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });

      // Replace PostgreSQL-style parameters ($1, $2) with MSSQL-style parameters (@param0, @param1)
      let mssqlQuery = text;
      for (let i = 0; i < params.length; i++) {
        mssqlQuery = mssqlQuery.replace(`$${i + 1}`, `@param${i}`);
      }

      return await request.query(mssqlQuery);
    } else {
      return await request.query(text);
    }
  } catch (err) {
    console.error('SQL query error:', err);
    throw err;
  }
}

// Transaction functions
async function beginTransaction() {
  try {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    const id = Date.now().toString();
    transactions.set(id, transaction);
    return id;
  } catch (err) {
    console.error('Begin transaction error:', err);
    throw err;
  }
}

async function commitTransaction(transactionId) {
  try {
    const transaction = transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }
    await transaction.commit();
    transactions.delete(transactionId);
  } catch (err) {
    console.error('Commit transaction error:', err);
    throw err;
  }
}

async function rollbackTransaction(transactionId) {
  try {
    const transaction = transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }
    await transaction.rollback();
    transactions.delete(transactionId);
  } catch (err) {
    console.error('Rollback transaction error:', err);
    throw err;
  }
}

async function queryWithinTransaction(transactionId, text, params = []) {
  try {
    const transaction = transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }

    const request = new sql.Request(transaction);

    // Add parameters to the request
    if (params && Array.isArray(params)) {
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });

      // Replace PostgreSQL-style parameters ($1, $2) with MSSQL-style parameters (@param0, @param1)
      let mssqlQuery = text;
      for (let i = 0; i < params.length; i++) {
        mssqlQuery = mssqlQuery.replace(`$${i + 1}`, `@param${i}`);
      }

      return await request.query(mssqlQuery);
    } else {
      return await request.query(text);
    }
  } catch (err) {
    console.error('Transaction query error:', err);
    throw err;
  }
}

module.exports = {
  query,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  queryWithinTransaction,
  pool,
  sql
};
