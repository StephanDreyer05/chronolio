import { sql } from "drizzle-orm";
import { db } from "../db";

/**
 * Migration to add the default_timeline_view_type column to the user_settings table
 */
async function addDefaultTimelineViewType() {
  console.log("Running migration: Add default_timeline_view_type column to user_settings table");
  
  try {
    // Check if the column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' 
      AND column_name = 'default_timeline_view_type'
    `;
    
    const columnExists = await db.execute(sql.raw(checkColumnQuery));
    
    if (columnExists.length === 0) {
      // Add the column with a default value
      const addColumnQuery = `
        ALTER TABLE user_settings 
        ADD COLUMN IF NOT EXISTS default_timeline_view_type TEXT NOT NULL DEFAULT 'list'
      `;
      
      await db.execute(sql.raw(addColumnQuery));
      console.log("Successfully added default_timeline_view_type column");
    } else {
      console.log("Column default_timeline_view_type already exists, skipping");
    }
    
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run the migration
addDefaultTimelineViewType()
  .then(() => {
    console.log("Migration completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });