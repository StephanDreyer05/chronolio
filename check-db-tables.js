/**
 * Script to check which tables exist in the database
 * 
 * Run with: node check-db-tables.js
 */

// Load environment variables
require('dotenv').config();

async function checkDatabaseTables() {
  try {
    // Import the database client
    const { createClient } = require('@libsql/client');
    
    // Get database URL from environment variables
    const dbUrl = process.env.DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN;
    
    if (!dbUrl) {
      console.error('Error: DATABASE_URL is missing in environment variables');
      process.exit(1);
    }

    // Create database client
    const db = createClient({
      url: dbUrl,
      authToken: authToken
    });
    
    console.log('Successfully connected to the database at:', dbUrl);
    
    // Get a list of all tables
    const tablesResult = await db.execute({
      sql: `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    });
    
    console.log('\nDatabase tables:');
    console.log('================');
    
    if (tablesResult.rows.length === 0) {
      console.log('No tables found in the database.');
    } else {
      tablesResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.name}`);
      });
      
      // Check specifically for public_timeline_shares
      const hasPublicSharesTable = tablesResult.rows.some(row => row.name === 'public_timeline_shares');
      
      if (hasPublicSharesTable) {
        console.log('\n✅ The public_timeline_shares table exists.');
      } else {
        console.log('\n❌ The public_timeline_shares table does NOT exist.');
        console.log('This is why you are getting the "relation does not exist" error.');
        console.log('\nPlease run one of the following scripts to create the table:');
        console.log('1. node run-migrations.js');
        console.log('2. node create-share-table.js');
      }
    }
    
  } catch (error) {
    console.error('Error checking database tables:', error);
    process.exit(1);
  }
}

// Run the function
checkDatabaseTables().catch(console.error); 