/**
 * Script to ensure the database schema is properly set up for Vercel
 * 
 * This script ensures that:
 * 1. All required tables exist
 * 2. All required columns exist
 * 3. Schema is compatible with Vercel's environment
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Get the directory name properly in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connection pool configuration optimized for verification
const poolConfig = {
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  // Set SSL mode to false by default to be more permissive
  ssl: {
    rejectUnauthorized: false
  }
};

async function runSqlFile(pool, filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`SQL file not found: ${filePath}`);
    return false;
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = sql
    .split(';')
    .filter(statement => statement.trim() !== '');

  try {
    for (const statement of statements) {
      await pool.query(statement);
    }
    return true;
  } catch (error) {
    console.error(`Error executing SQL from ${filePath}:`, error);
    return false;
  }
}

async function ensureDatabaseSchema() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is not set');
    return false;
  }

  console.log('🔍 Connecting to database...');
  const pool = new Pool({
    connectionString,
    ...poolConfig
  });

  try {
    console.log('✅ Database connection established');
    
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    console.log(`Found ${existingTables.length} tables in the database.`);

    // 1. Check and create users table if it doesn't exist
    if (!existingTables.includes('users')) {
      console.log('Creating users table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Users table created');
    }
    
    // 2. Check and create timelines table if it doesn't exist
    if (!existingTables.includes('timelines')) {
      console.log('Creating timelines table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS timelines (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Timelines table created');
    }
    
    // 3. Check and create timeline_events table if it doesn't exist
    if (!existingTables.includes('timeline_events')) {
      console.log('Creating timeline_events table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS timeline_events (
          id SERIAL PRIMARY KEY,
          timeline_id INTEGER REFERENCES timelines(id),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          start_date TIMESTAMP WITH TIME ZONE,
          end_date TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Timeline events table created');
    }
    
    // 4. Check and create the categories table if it doesn't exist
    if (!existingTables.includes('categories')) {
      console.log('Creating categories table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          name VARCHAR(255) NOT NULL,
          color VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Categories table created');
    }
    
    // 5. Check and create the event_categories table if it doesn't exist
    if (!existingTables.includes('event_categories')) {
      console.log('Creating event_categories table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS event_categories (
          id SERIAL PRIMARY KEY,
          event_id INTEGER REFERENCES timeline_events(id),
          category_id INTEGER REFERENCES categories(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Event categories table created');
    }
    
    // 6. Check and create public_timeline_shares table if it doesn't exist
    if (!existingTables.includes('public_timeline_shares')) {
      console.log('Creating public_timeline_shares table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public_timeline_shares (
          id SERIAL PRIMARY KEY,
          timeline_id INTEGER REFERENCES timelines(id),
          share_id VARCHAR(255) UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Public timeline shares table created');
    }
    
    // 7. Ensure the last_modified column exists in all time-sensitive tables
    const timeTablesNeedingLastModified = ['users', 'timelines', 'timeline_events'];
    for (const table of timeTablesNeedingLastModified) {
      const columnResult = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'last_modified'
      `, [table]);
      
      if (columnResult.rows.length === 0) {
        console.log(`Adding last_modified column to ${table} table...`);
        await pool.query(`
          ALTER TABLE ${table} 
          ADD COLUMN last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        `);
        console.log(`✅ Added last_modified column to ${table} table`);
      }
    }
    
    // 8. Run any SQL installation scripts if they exist
    if (fs.existsSync(path.join(__dirname, 'install-tables.sql'))) {
      console.log('Running additional SQL installation scripts...');
      await runSqlFile(pool, path.join(__dirname, 'install-tables.sql'));
      console.log('✅ SQL installation scripts completed');
    }
    
    console.log('\n✅ Database schema verification and updates completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Database schema update failed:', error.message);
    return false;
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the schema update
ensureDatabaseSchema().then(success => {
  if (success) {
    console.log('\n🎉 Your database is now properly configured for Vercel deployment.');
    console.log('You may need to redeploy your application for changes to take effect.');
  } else {
    console.log('\n❓ Database setup failed. Here are some things to check:');
    console.log('1. Verify your DATABASE_URL is correct and the database server is accessible.');
    console.log('2. Ensure your database user has permission to create tables and modify the schema.');
    console.log('3. If you\'re using a managed database service, check if it requires SSL connections.');
  }
});