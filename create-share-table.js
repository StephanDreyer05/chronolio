/**
 * Script to create the public_timeline_shares table in the database
 * 
 * Run with: node create-share-table.js
 */

// Load environment variables
require('dotenv').config();
console.log('Environment variables loaded');

async function createShareTable() {
  try {
    console.log('Starting create-share-table script...');
    
    // Import the database client
    const { createClient } = require('@libsql/client');
    console.log('Database client library loaded');
    
    // Get database URL from environment variables
    const dbUrl = process.env.DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN;
    
    console.log('Database URL:', dbUrl ? '✅ Found' : '❌ Missing');
    console.log('Auth token:', authToken ? '✅ Found' : '❌ Missing');
    
    if (!dbUrl) {
      console.error('Error: DATABASE_URL is missing in environment variables');
      process.exit(1);
    }

    // Create database client
    console.log('Connecting to database...');
    const db = createClient({
      url: dbUrl,
      authToken: authToken
    });
    
    console.log('Successfully connected to the database at:', dbUrl);
    
    // Check if the table already exists
    console.log('Checking if public_timeline_shares table already exists...');
    const tableCheck = await db.execute({
      sql: `SELECT name FROM sqlite_master WHERE type='table' AND name='public_timeline_shares'`
    });
    
    console.log('Table check result:', tableCheck.rows);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ The public_timeline_shares table already exists.');
      process.exit(0);
    }
    
    // Create the public_timeline_shares table
    console.log('Creating public_timeline_shares table...');
    
    try {
      await db.execute({
        sql: `
          CREATE TABLE public_timeline_shares (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timeline_id INTEGER NOT NULL,
            share_token TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            expires_at TIMESTAMP,
            is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
            FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE
          )
        `
      });
      
      console.log('✅ public_timeline_shares table created successfully!');
      
      // Verify the table was created
      const verifyTable = await db.execute({
        sql: `SELECT name FROM sqlite_master WHERE type='table' AND name='public_timeline_shares'`
      });
      
      if (verifyTable.rows.length > 0) {
        console.log('✅ Table creation verified');
      } else {
        console.error('❌ Table verification failed - table not found after creation');
      }
      
      console.log('\nYou can now create public share links for your timelines.');
    } catch (sqlError) {
      console.error('SQL Error creating table:', sqlError);
      console.error('Error message:', sqlError.message);
      
      if (sqlError.message && sqlError.message.includes('already exists')) {
        console.log('✅ Table already exists - no action needed');
      } else {
        throw sqlError;
      }
    }
    
  } catch (error) {
    console.error('Error creating public_timeline_shares table:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

// Run the function
createShareTable().catch(error => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
}); 