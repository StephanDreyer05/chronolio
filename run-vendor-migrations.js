/**
 * Script to run vendor table migrations
 * 
 * This script will add last_modified columns to timeline_vendors and timeline_event_vendors tables
 * Run with: node run-vendor-migrations.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Create a database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Running vendor table migrations...');
    
    // Read the migration SQL file
    const migrationFile = path.join(__dirname, 'migrations', 'add_last_modified_to_vendors_tables.sql');
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Uncaught error in migration script:', err);
  process.exit(1);
});