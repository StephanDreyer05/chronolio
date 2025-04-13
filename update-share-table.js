// Script to add the show_vendors column to the public_timeline_shares table
require('dotenv').config();
const { createClient } = require('@libsql/client');

async function main() {
  console.log('Connecting to database...');
  
  // Check if TURSO_DB_URL and TURSO_DB_AUTH_TOKEN are provided
  if (!process.env.TURSO_DB_URL) {
    console.error('Error: TURSO_DB_URL environment variable is not set');
    process.exit(1);
  }

  // Create database client
  const db = createClient({
    url: process.env.TURSO_DB_URL,
    authToken: process.env.TURSO_DB_AUTH_TOKEN
  });

  try {
    console.log('Checking if show_vendors column exists...');
    
    // Check if the column already exists
    const tableInfo = await db.execute({
      sql: "PRAGMA table_info(public_timeline_shares)"
    });
    
    const showVendorsColumnExists = tableInfo.rows.some(
      row => row.name === 'show_vendors'
    );
    
    if (showVendorsColumnExists) {
      console.log('The show_vendors column already exists. No changes needed.');
    } else {
      console.log('Adding show_vendors column...');
      
      // Add the column
      await db.execute({
        sql: "ALTER TABLE public_timeline_shares ADD COLUMN show_vendors BOOLEAN DEFAULT FALSE NOT NULL"
      });
      
      console.log('Column added successfully!');
    }
    
    // Verify the table structure
    console.log('\nCurrent table structure:');
    const updatedTableInfo = await db.execute({
      sql: "PRAGMA table_info(public_timeline_shares)"
    });
    
    updatedTableInfo.rows.forEach(column => {
      console.log(`- ${column.name} (${column.type})`);
    });
    
  } catch (error) {
    console.error('Error updating database:', error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('Database update completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  }); 