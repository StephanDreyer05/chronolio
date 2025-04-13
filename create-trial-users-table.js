// Script to create the trial_users table
import pg from 'pg';

async function createTrialUsersTable() {
  // Connect directly to PostgreSQL using the connection string
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to database");
    console.log("Creating trial_users table if it doesn't exist...");
    
    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'trial_users'
      )
    `);
    
    if (tableExists.rows[0].exists) {
      console.log("trial_users table already exists, skipping creation");
      return;
    }
    
    // Create the table
    await client.query(`
      CREATE TABLE trial_users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        additional_info JSONB NOT NULL DEFAULT '{}',
        converted_to_user BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    console.log("trial_users table created successfully!");
  } catch (error) {
    console.error("Error creating trial_users table:", error);
  } finally {
    await client.end();
    console.log("Disconnected from database");
    // Ensure we exit the process
    process.exit(0);
  }
}

createTrialUsersTable();