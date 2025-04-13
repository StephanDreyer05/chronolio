// Script to check column name casing in the public_timeline_shares table
require('dotenv').config();
const { createClient } = require('@libsql/client');

async function main() {
  console.log('Checking column name casing in database...');
  
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
    // Check table structure
    console.log('Examining public_timeline_shares table structure...');
    const tableInfo = await db.execute({
      sql: "PRAGMA table_info(public_timeline_shares)"
    });
    
    console.log('\nColumn names in public_timeline_shares table:');
    tableInfo.rows.forEach(col => {
      console.log(`- ${col.name} (${col.type})`);
    });
    
    // Check for presence of show_vendors or showVendors column
    const showVendorsUnderscoreExists = tableInfo.rows.some(row => row.name === 'show_vendors');
    const showVendorsCamelExists = tableInfo.rows.some(row => row.name === 'showVendors');
    
    console.log('\nColumn check results:');
    console.log(`- show_vendors (underscore version): ${showVendorsUnderscoreExists ? 'EXISTS' : 'MISSING'}`);
    console.log(`- showVendors (camelCase version): ${showVendorsCamelExists ? 'EXISTS' : 'MISSING'}`);
    
    // Check server code expectation
    console.log('\nServer code expectation:');
    console.log('- In schema.ts, column is defined as: showVendors (field) => show_vendors (database column)');
    console.log('- In routes.ts, API endpoint uses: showVendors (from request body)');
    
    // Suggest fix based on findings
    console.log('\nSuggested fix:');
    if (!showVendorsUnderscoreExists && !showVendorsCamelExists) {
      console.log('Neither column variant exists. You need to add the show_vendors column to the table.');
      console.log('Run the fix-share-table.js script to add the column properly.');
    } else if (showVendorsUnderscoreExists && !showVendorsCamelExists) {
      console.log('The show_vendors column exists (correct database format).');
      console.log('Your API might be trying to use showVendors in the code instead of accessing show_vendors.');
    } else if (!showVendorsUnderscoreExists && showVendorsCamelExists) {
      console.log('The showVendors column exists (camelCase format).');
      console.log('Your database schema might be defining the column differently than code expects.');
      console.log('You need to rename the column or update your schema definition to match.');
    } else {
      console.log('Both column variants exist! This could cause confusion.');
      console.log('Consider standardizing on one column naming convention.');
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('\nCheck completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  }); 