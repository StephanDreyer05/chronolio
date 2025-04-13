// Script to fix the public_timeline_shares table
require('dotenv').config();
const { createClient } = require('@libsql/client');

async function main() {
  console.log('Starting database schema fix operation...');
  
  if (!process.env.TURSO_DB_URL) {
    console.error('❌ Error: TURSO_DB_URL environment variable is not set');
    console.log('Please set the TURSO_DB_URL and TURSO_DB_AUTH_TOKEN environment variables and try again.');
    process.exit(1);
  }

  // Create database client
  const db = createClient({
    url: process.env.TURSO_DB_URL,
    authToken: process.env.TURSO_DB_AUTH_TOKEN
  });

  try {
    // Step 1: Check if the table exists
    console.log('Checking if public_timeline_shares table exists...');
    const tables = await db.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='public_timeline_shares'"
    });
    
    const tableExists = tables.rows.length > 0;
    
    if (!tableExists) {
      console.log('❌ Table public_timeline_shares does not exist. Creating it...');
      
      // Create the table
      await db.execute({
        sql: `
        CREATE TABLE IF NOT EXISTS public_timeline_shares (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timeline_id INTEGER NOT NULL,
          share_token TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          expires_at TIMESTAMP,
          is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
          show_vendors BOOLEAN DEFAULT FALSE NOT NULL,
          FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE
        );`
      });
      
      console.log('✅ Table created successfully!');
    } else {
      console.log('✅ Table public_timeline_shares exists.');
      
      // Step 2: Check if show_vendors column exists
      console.log('Checking if show_vendors column exists...');
      const tableInfo = await db.execute({
        sql: "PRAGMA table_info(public_timeline_shares)"
      });
      
      console.log('Current table structure:');
      tableInfo.rows.forEach(col => {
        console.log(`- ${col.name} (${col.type})`);
      });
      
      const showVendorsColumnExists = tableInfo.rows.some(
        row => row.name === 'show_vendors'
      );
      
      if (showVendorsColumnExists) {
        console.log('✅ show_vendors column already exists.');
      } else {
        // Try alternative column name
        const alternativeColumnExists = tableInfo.rows.some(
          row => row.name === 'showVendors'
        );
        
        if (alternativeColumnExists) {
          console.log('⚠️ Found column "showVendors" instead of "show_vendors".');
          // Deal with this case if needed
        } else {
          console.log('❌ show_vendors column does not exist. Adding it...');
          
          try {
            // Add the column
            await db.execute({
              sql: "ALTER TABLE public_timeline_shares ADD COLUMN show_vendors BOOLEAN DEFAULT FALSE NOT NULL"
            });
            
            console.log('✅ Column added successfully!');
          } catch (alterError) {
            console.error('Error adding column:', alterError);
            console.log('\n⚠️ Trying alternative approach...');
            
            // Try an alternative approach with quoted identifiers
            try {
              await db.execute({
                sql: 'ALTER TABLE "public_timeline_shares" ADD COLUMN "show_vendors" BOOLEAN DEFAULT FALSE NOT NULL'
              });
              console.log('✅ Column added successfully with alternative approach!');
            } catch (altError2) {
              console.error('Alternative approach failed:', altError2);
            }
          }
        }
      }
    }
    
    // Final check
    console.log('\nVerifying table structure after updates:');
    const finalCheck = await db.execute({
      sql: "PRAGMA table_info(public_timeline_shares)"
    });
    
    finalCheck.rows.forEach(col => {
      console.log(`- ${col.name} (${col.type})`);
    });
    
    console.log('\n✅ Database schema update completed!');
    
  } catch (error) {
    console.error('Error updating database schema:', error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('Script execution completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  }); 