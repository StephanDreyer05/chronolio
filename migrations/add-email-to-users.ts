import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Migration to add email field and verification fields to the users table
 */
async function addEmailToUsers() {
  console.log("Starting migration: Adding email field and verification fields to users table");
  
  try {
    // Check if the email column already exists to prevent errors
    const checkColumnQuery = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'email'
    `;
    
    const emailColumnExists = await db.execute(checkColumnQuery);
    
    if (emailColumnExists.rows.length === 0) {
      // Add the email column to the users table
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN email TEXT UNIQUE,
        ADD COLUMN is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN email_verification_token TEXT,
        ADD COLUMN email_verification_token_expires TIMESTAMP
      `);
      
      console.log("Migration successful: Added email field and verification fields to users table");
    } else {
      console.log("Migration skipped: Email column already exists in users table");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run the migration
addEmailToUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });