/**
 * Database configuration for Vercel environments
 * 
 * This file provides specialized configuration for Vercel deployments
 * to help properly connect to the database in serverless functions.
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import schema from './schema.js';

// Log environment variables (sanitized)
console.log('[DB] Environment check:', {
  hasDbUrl: !!process.env.DATABASE_URL,
  dbUrlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 10) + '...' : 'not set',
  nodeEnv: process.env.NODE_ENV,
  vercel: process.env.VERCEL,
  dbSsl: process.env.DATABASE_SSL
});

// Connection pool configuration optimized for Vercel's serverless environment
const poolConfig = {
  // Use a smaller connection pool for serverless functions
  max: 1,
  connectionTimeoutMillis: 60000, // Increased from 10000 to 60000 (60 seconds)
  idleTimeoutMillis: 30000,
};

// Determine if SSL should be enabled (typically required for production databases)
const sslMode = process.env.DATABASE_SSL === 'false' ? false : true;

// Create a connection pool with the appropriate configuration
function createDbPool() {
  // Verify the connection string exists
  if (!process.env.DATABASE_URL) {
    console.error('[DB] DATABASE_URL environment variable is not set');
    throw new Error('Database connection string not provided');
  }

  const connectionString = process.env.DATABASE_URL;
  
  // Enhanced logging for connection
  console.log(`[DB] Creating connection pool with max=${poolConfig.max}, ssl=${sslMode}`);
  
  // Add SSL configuration - most cloud PostgreSQL providers require this
  // We've enhanced this to better handle different hosting providers
  if (sslMode) {
    poolConfig.ssl = {
      // Set to false to support a wider range of PostgreSQL providers
      // This is more permissive but works with most hosting providers
      rejectUnauthorized: false,
    };
  }
  
  try {
    // Create the connection pool
    const pool = new Pool({
      connectionString,
      ...poolConfig,
    });
    
    // Add error handler for unexpected issues
    pool.on('error', (err) => {
      console.error('[DB] Unexpected PostgreSQL pool error:', err.message, err.stack);
      // Don't crash the application in production, but log the error
    });

    // Add connect handler to track successful connections
    pool.on('connect', (client) => {
      console.log('[DB] New database connection established');
      
      // Add query handler to track slow queries
      const originalQuery = client.query;
      client.query = function(...args) {
        const start = Date.now();
        const queryText = typeof args[0] === 'string' ? args[0] : args[0]?.text || 'unknown query';
        const queryId = Math.random().toString(36).substring(2, 10);
        
        console.log(`[DB] Query ${queryId} started: ${queryText.substring(0, 100)}${queryText.length > 100 ? '...' : ''}`);
        
        const query = originalQuery.apply(this, args);
        
        query.then(() => {
          const duration = Date.now() - start;
          console.log(`[DB] Query ${queryId} completed in ${duration}ms`);
          
          if (duration > 1000) {
            console.warn(`[DB] Slow query detected (${duration}ms): ${queryText.substring(0, 200)}`);
          }
        }).catch(err => {
          const duration = Date.now() - start;
          console.error(`[DB] Query ${queryId} failed after ${duration}ms:`, err.message);
        });
        
        return query;
      };
    });
    
    return pool;
  } catch (error) {
    console.error('[DB] Failed to create database pool:', error);
    throw error;
  }
}

// Add a function to test the database connection
async function testConnection(pool) {
  try {
    console.log('[DB] Testing database connection...');
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT 1 as connection_test, current_schema() as schema, current_database() as database');
      console.log('[DB] Connection test result:', result.rows[0]);
      return !!result.rows[0].connection_test;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[DB] Database connection test failed:', error.message, error.stack);
    throw error;
  }
}

// Execute SQL with retry logic for Vercel's cold starts
async function executeWithRetry(pool, sqlQuery, params = [], maxRetries = 3) {
  let retries = 0;
  let lastError;

  while (retries < maxRetries) {
    try {
      const client = await pool.connect();
      try {
        return await client.query(sqlQuery, params);
      } finally {
        client.release();
      }
    } catch (error) {
      lastError = error;
      console.error(`[DB] Database query failed (retry ${retries + 1}/${maxRetries}):`, error.message);
      retries++;
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retries)));
    }
  }

  throw lastError;
}

// Create and export the database client
let db;
let pool;
try {
  pool = createDbPool();
  
  // Log the connection details (without sensitive information)
  console.log('[DB] Database pool created, max connections:', poolConfig.max);
  
  // Create the drizzle client
  db = drizzle(pool, { schema });
  
  // Add execute method to db for raw SQL queries with retry capability
  db.execute = async (query) => {
    // Convert drizzle SQL object to string if needed
    const sqlString = typeof query === 'object' && query.toString ? query.toString() : query;
    return executeWithRetry(pool, sqlString);
  };
  
  // Immediately test the connection
  testConnection(pool)
    .then(success => {
      if (success) {
        console.log('[DB] Database connection initialized and verified');
      } else {
        console.error('[DB] Database connection test returned false');
      }
    })
    .catch(err => {
      console.error('[DB] Initial connection test failed:', err.message);
    });
  
} catch (error) {
  console.error('[DB] Database initialization failed:', error);
  // Create a stub db object to prevent the application from crashing
  // This will make failed operations throw specific errors instead of null reference errors
  db = {
    query: {
      users: {
        findMany: async () => { throw new Error('Database connection failed'); },
        findFirst: async () => { throw new Error('Database connection failed'); },
      },
      timelines: {
        findMany: async () => { throw new Error('Database connection failed'); },
        findFirst: async () => { throw new Error('Database connection failed'); },
      },
    },
    insert: () => { throw new Error('Database connection failed'); },
    update: () => { throw new Error('Database connection failed'); },
    delete: () => { throw new Error('Database connection failed'); },
    execute: () => { throw new Error('Database connection failed'); },
  };
}

export { db };