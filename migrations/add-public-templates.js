/**
 * Migration to add the is_public column to the templates table
 * Run with: node migrations/add-public-templates.js
 */

import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

async function addPublicTemplatesColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to the database...');
    await client.connect();
    
    // Check if column exists
    const checkResult = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'templates' AND column_name = 'is_public';
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('Adding is_public column to templates table...');
      
      // Add is_public column
      await client.query(`
        ALTER TABLE templates
        ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      
      console.log('Migration completed successfully! is_public column has been added to templates table.');
    } else {
      console.log('is_public column already exists in templates table.');
    }
  } catch (error) {
    console.error('Error executing migration:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

// Run the migration
addPublicTemplatesColumn().catch(console.error);