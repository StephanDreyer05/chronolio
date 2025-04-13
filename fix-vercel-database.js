/**
 * Script to debug and fix database connection issues in Vercel deployment
 * 
 * This script will:
 * 1. Check the database connection configuration
 * 2. Add error handling specifically for Vercel deployment
 * 3. Create a validation endpoint to test database connectivity
 */

// Add a database connection test endpoint to the API
const fs = require('fs');
const path = require('path');

// Path to the API file
const apiFilePath = path.join(__dirname, 'api', 'index.js');

// Check if the file exists
if (!fs.existsSync(apiFilePath)) {
  console.error(`Error: API file not found at ${apiFilePath}`);
  process.exit(1);
}

// Read the API file
let apiFileContent = fs.readFileSync(apiFilePath, 'utf8');

// Check if the database health check route already exists
if (apiFileContent.includes('dbHealthCheck')) {
  console.log('Database health check route already exists, skipping...');
} else {
  // Add a database health check route at the end of the file before module.exports
  const healthCheckRoute = `
// Database health check endpoint for debugging Vercel deployments
app.get('/api/db-health', async (req, res) => {
  try {
    // Import the database client
    const { db } = require('../db');
    
    // Test a simple query
    const result = await db.query.users.findMany({
      limit: 1
    });
    
    return res.json({ 
      status: 'ok', 
      message: 'Database connection successful', 
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      connectionInfo: {
        // Only share non-sensitive parts of connection info
        host: process.env.DATABASE_URL ? 'Set (value hidden)' : 'Not set',
        ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? 'Enabled' : 'Not specified'
      }
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed', 
      error: error.message,
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString()
    });
  }
});

`;

  // Find the position to insert the health check route
  const insertPosition = apiFileContent.lastIndexOf('module.exports');
  
  if (insertPosition === -1) {
    console.error('Could not find module.exports in the API file');
    process.exit(1);
  }

  // Insert the health check route
  apiFileContent = 
    apiFileContent.slice(0, insertPosition) + 
    healthCheckRoute + 
    apiFileContent.slice(insertPosition);

  // Write the updated content back to the file
  fs.writeFileSync(apiFilePath, apiFileContent);
  console.log('Added database health check route to API file');
}

// Create a database connection helper for Vercel
const dbHelperPath = path.join(__dirname, 'db', 'vercel-helper.js');
fs.writeFileSync(dbHelperPath, `/**
 * Vercel database connection helper
 * 
 * This file provides enhanced database connection handling for Vercel deployments
 */

const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');

/**
 * Create a database connection with improved error handling for Vercel
 */
function createVercelDbConnection() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    return null;
  }

  // Configure the PostgreSQL connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // These settings are optimized for Vercel serverless functions
    max: 1,                // Maximum number of clients
    connectionTimeoutMillis: 5000, // Connection timeout
    idleTimeoutMillis: 30000,     // How long a client is allowed to remain idle
    // Enhanced SSL configuration that works with more database providers
    ssl: process.env.NODE_ENV === 'production' ? 
      { rejectUnauthorized: false } : // More permissive SSL setting
      undefined
  });

  // Add error handler to the pool
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    // Don't crash the application, just log the error
  });

  // Return the drizzle instance
  return drizzle(pool);
}

module.exports = { createVercelDbConnection };
`);
console.log('Created Vercel-specific database helper');

// Now update the schema.ts file to fix the 'last_modified' issues
const schemaPath = path.join(__dirname, 'db', 'schema.ts');

if (fs.existsSync(schemaPath)) {
  let schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  // Check if last_modified already exists in the schema
  if (!schemaContent.includes('last_modified:')) {
    console.log('Adding last_modified field to schema definitions...');
    
    // Add last_modified to relevant tables by looking for updatedAt fields
    // This is a rough fix - ideally we'd parse the TypeScript properly
    schemaContent = schemaContent.replace(
      /updatedAt: timestamp\([^)]*\)\.defaultNow\(\)/g, 
      `updatedAt: timestamp("updated_at").defaultNow(),\n  last_modified: timestamp("last_modified").defaultNow()`
    );
    
    fs.writeFileSync(schemaPath, schemaContent);
    console.log('Updated schema with last_modified fields');
  } else {
    console.log('last_modified field already exists in schema');
  }
} else {
  console.error(`Error: Schema file not found at ${schemaPath}`);
}

console.log('Database fix script completed');