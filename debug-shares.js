// Debug script to check public_timeline_shares table values
require('dotenv').config();
const { createClient } = require('@libsql/client');

// Initialize the database client
function initDbClient() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  return createClient({
    url,
    authToken
  });
}

// Main function
async function main() {
  try {
    console.log('Connecting to database...');
    const db = initDbClient();
    
    // Check connection
    await db.execute('SELECT 1');
    console.log('Database connection successful\n');
    
    // Check if public_timeline_shares table exists
    const tablesResult = await db.execute(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='public_timeline_shares'`
    );
    
    if (tablesResult.rows.length === 0) {
      console.error('Error: public_timeline_shares table does not exist');
      process.exit(1);
    }
    
    console.log('✅ public_timeline_shares table exists');
    
    // Check table structure
    const tableInfoResult = await db.execute(
      `PRAGMA table_info(public_timeline_shares)`
    );
    
    console.log('\nTable structure:');
    tableInfoResult.rows.forEach(row => {
      console.log(`- ${row.name}: ${row.type} ${row.notnull ? '(NOT NULL)' : ''}`);
    });
    
    // Check if showVendors column exists
    const hasShowVendorsColumn = tableInfoResult.rows.some(row => row.name === 'showVendors');
    
    if (!hasShowVendorsColumn) {
      console.error('\nError: showVendors column does not exist in public_timeline_shares table');
      process.exit(1);
    }
    
    console.log('\n✅ showVendors column exists in the table');
    
    // List all shares
    const sharesResult = await db.execute(
      `SELECT id, timelineId, shareToken, isEnabled, showVendors, createdAt, updatedAt 
       FROM public_timeline_shares 
       ORDER BY updatedAt DESC`
    );
    
    console.log('\nExisting shares:');
    if (sharesResult.rows.length === 0) {
      console.log('No shares found');
    } else {
      sharesResult.rows.forEach(share => {
        console.log(`ID: ${share.id}, Timeline: ${share.timelineId}, Token: ${share.shareToken}`);
        console.log(`  Enabled: ${share.isEnabled}, ShowVendors: ${share.showVendors}`);
        console.log(`  Created: ${share.createdAt}, Updated: ${share.updatedAt}`);
        console.log('-----');
      });
    }
    
    // Test update of a share if any exists
    if (sharesResult.rows.length > 0) {
      const firstShare = sharesResult.rows[0];
      const newShowVendorsValue = !firstShare.showVendors;
      
      console.log(`\nUpdating share ID ${firstShare.id} - changing showVendors from ${firstShare.showVendors} to ${newShowVendorsValue}`);
      
      await db.execute({
        sql: `UPDATE public_timeline_shares 
              SET showVendors = ?, updatedAt = CURRENT_TIMESTAMP 
              WHERE id = ?`,
        args: [newShowVendorsValue, firstShare.id]
      });
      
      // Verify the update
      const updatedShareResult = await db.execute({
        sql: `SELECT id, timelineId, showVendors 
              FROM public_timeline_shares 
              WHERE id = ?`,
        args: [firstShare.id]
      });
      
      if (updatedShareResult.rows.length > 0) {
        const updatedShare = updatedShareResult.rows[0];
        console.log(`✅ Share updated - new showVendors value: ${updatedShare.showVendors}`);
      } else {
        console.error('Error: Could not retrieve the updated share');
      }
    }
    
    console.log('\nDebug completed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 