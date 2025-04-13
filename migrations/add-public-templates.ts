import { sql } from "drizzle-orm";
import { db } from "../db";

/**
 * Migration to add the isPublic column to the templates table
 */
async function addPublicTemplates() {
  console.log("Running migration: Add isPublic column to templates table");
  
  try {
    // Check if the column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'templates' 
      AND column_name = 'is_public'
    `;
    
    const columnExists = await db.execute(sql.raw(checkColumnQuery));
    
    if (columnExists.rows.length === 0) {
      // Add the column with a default value
      const addColumnQuery = `
        ALTER TABLE templates 
        ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE
      `;
      
      await db.execute(sql.raw(addColumnQuery));
      console.log("Successfully added is_public column");
    } else {
      console.log("Column is_public already exists, skipping");
    }
    
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run the migration
addPublicTemplates().catch(console.error); 