import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Migration to add password reset fields to the users table
 */
async function addPasswordResetFields() {
  console.log('Starting migration: Adding password reset fields to users table');
  
  try {
    // Check if the columns already exist
    const checkQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('password_reset_token', 'password_reset_token_expires')
    `;
    
    const result = await db.execute(sql.raw(checkQuery));
    const existingColumns = result.rows.map((row: any) => row.column_name);
    
    // Add password_reset_token column if it doesn't exist
    if (!existingColumns.includes('password_reset_token')) {
      console.log('Adding password_reset_token column');
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN password_reset_token TEXT
      `);
    } else {
      console.log('password_reset_token column already exists, skipping');
    }
    
    // Add password_reset_token_expires column if it doesn't exist
    if (!existingColumns.includes('password_reset_token_expires')) {
      console.log('Adding password_reset_token_expires column');
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN password_reset_token_expires TIMESTAMP
      `);
    } else {
      console.log('password_reset_token_expires column already exists, skipping');
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
addPasswordResetFields()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });