// Script to debug the showVendors flag in public_timeline_shares table
require('dotenv').config();
const { createClient } = require('@libsql/client');

async function main() {
  console.log('Starting public share debug...');

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
    // First, verify the table structure to confirm the show_vendors column exists
    console.log('Verifying table structure:');
    const tableInfo = await db.execute({
      sql: "PRAGMA table_info(public_timeline_shares)"
    });

    console.log('Column names:');
    tableInfo.rows.forEach(col => {
      console.log(`- ${col.name} (${col.type})`);
    });

    // Check all existing shares
    console.log('\nChecking existing public shares:');
    const shares = await db.execute({
      sql: "SELECT * FROM public_timeline_shares"
    });

    if (shares.rows.length === 0) {
      console.log('No shares found in the database.');
    } else {
      console.log(`Found ${shares.rows.length} shares.`);
      shares.rows.forEach((share, index) => {
        console.log(`\nShare #${index + 1}:`);
        for (const [key, value] of Object.entries(share)) {
          console.log(`  ${key}: ${value}`);
        }
      });
    }

    // Try updating all existing shares to have show_vendors = true for testing
    console.log('\nUpdating all shares to have show_vendors = true for testing:');
    const updateResult = await db.execute({
      sql: "UPDATE public_timeline_shares SET show_vendors = true WHERE is_enabled = true"
    });
    console.log(`Updated ${updateResult.rowsAffected} shares.`);

    // Verify the changes
    console.log('\nVerifying changes:');
    const updatedShares = await db.execute({
      sql: "SELECT * FROM public_timeline_shares WHERE is_enabled = true"
    });
    
    if (updatedShares.rows.length === 0) {
      console.log('No active shares found after update.');
    } else {
      console.log(`Found ${updatedShares.rows.length} active shares after update.`);
      updatedShares.rows.forEach((share, index) => {
        console.log(`\nShare #${index + 1}:`);
        for (const [key, value] of Object.entries(share)) {
          console.log(`  ${key}: ${value}`);
        }
      });
    }

  } catch (error) {
    console.error('Error debugging public shares:', error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('\nDebug completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  }); 