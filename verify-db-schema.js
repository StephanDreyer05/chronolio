/**
 * Script to verify the database schema and table structure in Vercel environments
 * 
 * This script connects to the database and checks if all expected tables are present.
 * It helps diagnose issues with the database setup in Vercel environments.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define table names to check
const expectedTables = [
  'users',
  'timelines',
  'timeline_events',
  'categories',
  'event_categories',
  'public_timeline_shares'
];

// Connection pool configuration optimized for verification
const poolConfig = {
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  // Set SSL mode to false by default to be more permissive
  ssl: {
    rejectUnauthorized: false
  }
};

async function verifyDatabaseSchema() {
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
    
    // Check PostgreSQL version
    const versionResult = await pool.query('SELECT version()');
    console.log(`📊 PostgreSQL version: ${versionResult.rows[0].version}`);
    
    // Get list of tables in the public schema
    const tableResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const existingTables = tableResult.rows.map(row => row.table_name);
    
    console.log(`\n📋 Found ${existingTables.length} tables in the database:\n`);
    existingTables.forEach(table => console.log(`- ${table}`));
    
    // Check for missing tables
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log(`\n⚠️ Missing tables (${missingTables.length}):`);
      missingTables.forEach(table => console.log(`- ${table}`));
    } else {
      console.log(`\n✅ All expected tables are present in the database`);
    }
    
    // For each existing table that we expect, get column information
    console.log('\n📊 Table structure details:');
    for (const table of expectedTables) {
      if (existingTables.includes(table)) {
        const columnResult = await pool.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [table]);
        
        console.log(`\n📋 Table: ${table} (${columnResult.rows.length} columns)`);
        columnResult.rows.forEach(col => {
          console.log(`  - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
      }
    }
    
    // Check if critical columns exist
    // For example, check if users table has id, email, and password
    if (existingTables.includes('users')) {
      const userColumnsResult = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users'
      `);
      
      const userColumns = userColumnsResult.rows.map(row => row.column_name);
      const criticalUserColumns = ['id', 'email', 'password'];
      const missingUserColumns = criticalUserColumns.filter(col => !userColumns.includes(col));
      
      if (missingUserColumns.length > 0) {
        console.log(`\n⚠️ Missing critical columns in users table: ${missingUserColumns.join(', ')}`);
      } else {
        console.log('\n✅ All critical columns present in users table');
      }
    }
    
    // Check for last_modified field in relevant tables for Vercel compatibility
    const tablesWithTimestamps = ['users', 'timelines', 'timeline_events'];
    for (const table of tablesWithTimestamps) {
      if (existingTables.includes(table)) {
        const lastModifiedResult = await pool.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'last_modified'
        `, [table]);
        
        if (lastModifiedResult.rows.length === 0) {
          console.log(`\n⚠️ Table '${table}' is missing 'last_modified' column (required for Vercel compatibility)`);
        } else {
          console.log(`\n✅ Table '${table}' has 'last_modified' column for Vercel compatibility`);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('🔍 This appears to be a hostname resolution error. Check if your database host is correct.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔍 Connection was refused. Check if your database is running and accessible from Vercel.');
    } else if (error.code === '28P01') {
      console.error('🔍 Authentication failed. Check your database username and password.');
    } else if (error.code === '3D000') {
      console.error('🔍 Database does not exist. Check your database name.');
    }
    return false;
  } finally {
    // Close the pool
    await pool.end();
    console.log('\n🏁 Database verification completed');
  }
}

// Run the verification
verifyDatabaseSchema().then(success => {
  if (!success) {
    console.log('\n❓ Need help? Check these things:');
    console.log('1. Verify your DATABASE_URL is correct in Vercel Environment Variables');
    console.log('2. Ensure your database is publicly accessible or properly configured for Vercel');
    console.log('3. Make sure you have run migrations or schema setup scripts');
    console.log('4. If SSL issues occur, try adding "?sslmode=require" to your connection string');
  }
});