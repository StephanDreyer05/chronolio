/**
 * Script to test database connectivity in a simulated Vercel environment
 * 
 * This script tests your DATABASE_URL connection with Vercel-like settings
 * to help identify issues before deploying to Vercel.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Connection configurations to test
const connectionConfigs = [
  {
    name: "Default Configuration",
    config: { ssl: false }
  },
  {
    name: "With SSL (rejectUnauthorized: false)",
    config: { ssl: { rejectUnauthorized: false } }
  },
  {
    name: "With SSL (rejectUnauthorized: true)",
    config: { ssl: { rejectUnauthorized: true } }
  }
];

async function testDatabaseConnection() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('Please set your DATABASE_URL environment variable to the same value you\'re using in Vercel.');
    return false;
  }

  console.log('🔍 Testing database connection with different configurations...\n');

  // Parse the connection string to check its format
  try {
    const urlPattern = /^postgresql:\/\/(.*):(.*)@(.*):(\d+)\/(.*)$/;
    const match = connectionString.match(urlPattern);
    
    if (!match) {
      console.log('⚠️ Your DATABASE_URL format looks unusual. It should be in the format:');
      console.log('   postgresql://username:password@host:port/database');
      console.log('   Make sure special characters in username/password are URL-encoded.\n');
    } else {
      console.log('✅ Your DATABASE_URL format appears correct.\n');
      
      // Extract components without logging sensitive information
      const [_, username, password, host, port, database] = match;
      
      console.log(`Host: ${host}`);
      console.log(`Port: ${port}`);
      console.log(`Database: ${database}`);
      console.log(`Username: ${'*'.repeat(username.length)}`);
      console.log(`Password: ${'*'.repeat(password.length)}\n`);
      
      // Check for SSL parameters
      const hasSSLParam = connectionString.includes('?sslmode=require') || 
                          connectionString.includes('?ssl=true');
      
      if (!hasSSLParam) {
        console.log('⚠️ Your connection string doesn\'t include SSL parameters.');
        console.log('   For most cloud database providers, you should add:');
        console.log('   ?sslmode=require   or   ?ssl=true\n');
      } else {
        console.log('✅ Your connection string includes SSL parameters.\n');
      }
    }
  } catch (error) {
    console.error('❌ Error parsing connection string:', error.message);
  }

  // Test each configuration
  let anySuccessful = false;
  
  for (const { name, config } of connectionConfigs) {
    console.log(`\n----- Testing: ${name} -----`);
    
    const pool = new Pool({
      connectionString,
      // These settings simulate Vercel serverless functions
      max: 1,                // Maximum number of clients
      connectionTimeoutMillis: 5000, // Connection timeout
      idleTimeoutMillis: 30000,     // How long a client is allowed to remain idle
      ...config
    });

    try {
      console.log('Connecting to database...');
      const client = await pool.connect();
      
      try {
        console.log('Running test query...');
        const result = await client.query('SELECT version()');
        console.log(`✅ Connection successful!`);
        console.log(`PostgreSQL version: ${result.rows[0].version.split(',')[0]}`);
        
        // Try to query a table to see if permissions are correct
        try {
          const tableResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            LIMIT 5
          `);
          
          if (tableResult.rows.length > 0) {
            console.log(`✅ Successfully queried table information`);
            console.log(`Found ${tableResult.rows.length} tables (showing up to 5):`);
            tableResult.rows.forEach(row => console.log(`- ${row.table_name}`));
          } else {
            console.log(`⚠️ No tables found in the public schema`);
          }
        } catch (tableError) {
          console.error(`❌ Error querying table information:`, tableError.message);
        }
        
        anySuccessful = true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`❌ Connection failed:`, error.message);
      
      // Provide specific troubleshooting advice based on error code
      if (error.code === 'ENOTFOUND') {
        console.error('   This is a hostname resolution error. Check if your database host is correct.');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('   Connection was refused. Check if your database is publicly accessible.');
      } else if (error.code === '28P01') {
        console.error('   Authentication failed. Check your database username and password.');
      } else if (error.code === '3D000') {
        console.error('   Database does not exist. Check your database name.');
      } else if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
        console.error('   SSL certificate validation failed. Try the configuration with rejectUnauthorized: false');
      }
    } finally {
      await pool.end();
    }
  }

  return anySuccessful;
}

// Run the verification
testDatabaseConnection().then(success => {
  console.log('\n----- Connection Test Summary -----');
  if (success) {
    console.log('✅ At least one connection configuration succeeded!');
    console.log('This means your database is accessible and should work in Vercel when configured correctly.');
    console.log('\nNext steps:');
    console.log('1. Update your Vercel environment variables with this DATABASE_URL');
    console.log('2. Make sure the SSL configuration matches the successful test');
    console.log('3. Check that all required tables exist using: node verify-db-schema.js');
  } else {
    console.log('❌ All connection configurations failed.');
    console.log('This means your database is not accessible with the current configuration.');
    console.log('\nTroubleshooting steps:');
    console.log('1. Check if the database host allows connections from your current IP address');
    console.log('2. Verify username/password credentials are correct');
    console.log('3. Try a different database provider (Neon, Supabase, etc.)');
    console.log('4. Check if your database provider has a connection URL generator');
  }
});