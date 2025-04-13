/**
 * Script to run database migrations
 * 
 * This script will run the missing migrations to create the public_timeline_shares table
 * Run with: node run-migrations.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Running database migrations to create missing tables...');

try {
  // Check if migrations exist
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error('Migrations directory not found. Make sure you are in the project root directory.');
    process.exit(1);
  }

  // Create a new migration file for public_timeline_shares if it doesn't exist
  const migrationFilePath = path.join(migrationsDir, '0001_add_public_timeline_shares.sql');
  if (!fs.existsSync(migrationFilePath)) {
    console.log('Creating migration file for public_timeline_shares table...');
    
    // Create the migration file
    const migrationSQL = `
-- Migration: add public_timeline_shares table
-- Created at: ${new Date().toISOString()}

CREATE TABLE IF NOT EXISTS "public_timeline_shares" (
  "id" serial PRIMARY KEY NOT NULL,
  "timeline_id" integer NOT NULL,
  "share_token" text NOT NULL UNIQUE,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp
);

-- Add foreign key constraint
ALTER TABLE "public_timeline_shares" ADD CONSTRAINT "public_timeline_shares_timeline_id_fkey" 
FOREIGN KEY ("timeline_id") REFERENCES "timelines"("id") ON DELETE CASCADE;
`;
    
    fs.writeFileSync(migrationFilePath, migrationSQL);
    console.log(`Created migration file: ${migrationFilePath}`);
  }

  // Run the migrations
  console.log('Running database migrations...');
  try {
    // Using drizzle-kit or whatever migration tool is set up for the project
    const output = execSync('npx drizzle-kit migrate', { stdio: 'inherit' });
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Error running migrations with drizzle-kit. Trying alternative command...');
    try {
      // Alternate command if drizzle-kit doesn't work
      const output = execSync('npm run db:migrate', { stdio: 'inherit' });
      console.log('Migrations completed successfully!');
    } catch (migrationError) {
      console.error('Error running migrations:', migrationError.message);
      console.log('\nPlease run the migrations manually using the appropriate command for your project.');
      process.exit(1);
    }
  }

  console.log('\nDatabase migration complete!');
  console.log('The public_timeline_shares table has been created.');
  console.log('You should now be able to use the Share feature.');

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
} 