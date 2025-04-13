/**
 * Database Transfer Utility
 * 
 * This script helps you transfer data from one PostgreSQL database to another.
 * Useful when setting up a new database for Vercel deployment.
 * 
 * Usage:
 * 1. Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL environment variables
 * 2. Run: node transfer-database.js
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import readline from 'readline';

// Load environment variables
dotenv.config();

// Utility to prompt for confirmation
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Get input from user
async function question(rl, query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Define tables in order of dependency (parents first)
const tables = [
  'users',
  'timelines',
  'timeline_events',
  'categories',
  'event_categories',
  'public_timeline_shares'
];

// Connection pool configuration
const poolConfig = {
  max: 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  ssl: { rejectUnauthorized: false }
};

async function transferDatabase() {
  // Check environment variables
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.TARGET_DATABASE_URL;
  
  if (!sourceUrl || !targetUrl) {
    console.error('❌ SOURCE_DATABASE_URL and TARGET_DATABASE_URL must be set');
    console.log('\nPlease set these environment variables:');
    console.log('- SOURCE_DATABASE_URL: Your current database URL');
    console.log('- TARGET_DATABASE_URL: The new database URL for Vercel');
    return false;
  }
  
  if (sourceUrl === targetUrl) {
    console.error('❌ Source and target database URLs must be different');
    return false;
  }
  
  // Create connection pools
  const sourcePool = new Pool({
    connectionString: sourceUrl,
    ...poolConfig
  });
  
  const targetPool = new Pool({
    connectionString: targetUrl,
    ...poolConfig
  });
  
  try {
    // Check connections
    console.log('🔍 Testing database connections...');
    
    try {
      const sourceClient = await sourcePool.connect();
      const sourceResult = await sourceClient.query('SELECT version()');
      console.log(`✅ Source database connected (${sourceResult.rows[0].version.split(',')[0]})`);
      sourceClient.release();
    } catch (error) {
      console.error('❌ Source database connection failed:', error.message);
      return false;
    }
    
    try {
      const targetClient = await targetPool.connect();
      const targetResult = await targetClient.query('SELECT version()');
      console.log(`✅ Target database connected (${targetResult.rows[0].version.split(',')[0]})`);
      targetClient.release();
    } catch (error) {
      console.error('❌ Target database connection failed:', error.message);
      return false;
    }
    
    // Get confirmation before proceeding
    const rl = createInterface();
    const answer = await question(rl, '\n⚠️ This will transfer data from your source database to the target database. Continue? (y/n): ');
    
    if (answer.toLowerCase() !== 'y') {
      console.log('Operation cancelled.');
      rl.close();
      return false;
    }
    
    // Check if target database already has data
    const targetClient = await targetPool.connect();
    try {
      // Check if users table exists and has data
      const tableExistsResult = await targetClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'users'
        )
      `);
      
      if (tableExistsResult.rows[0].exists) {
        const countResult = await targetClient.query('SELECT COUNT(*) FROM users');
        const userCount = parseInt(countResult.rows[0].count);
        
        if (userCount > 0) {
          const overwriteAnswer = await question(rl, `\n⚠️ Target database already has ${userCount} users. Overwrite existing data? (y/n): `);
          
          if (overwriteAnswer.toLowerCase() !== 'y') {
            console.log('Operation cancelled to prevent data loss.');
            rl.close();
            return false;
          }
        }
      }
    } finally {
      targetClient.release();
    }
    
    rl.close();
    
    // Create tables in target database if they don't exist
    console.log('\n🔧 Ensuring tables exist in target database...');
    for (const table of tables) {
      try {
        // Get table schema from source database
        const sourceClient = await sourcePool.connect();
        try {
          const schemaResult = await sourceClient.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
          `, [table]);
          
          if (schemaResult.rows.length === 0) {
            console.log(`⚠️ Table '${table}' not found in source database, skipping...`);
            continue;
          }
          
          // Create table in target if it doesn't exist
          const targetClient = await targetPool.connect();
          try {
            const tableExistsResult = await targetClient.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = $1
              )
            `, [table]);
            
            if (!tableExistsResult.rows[0].exists) {
              // Generate CREATE TABLE statement
              let createTableSQL = `CREATE TABLE ${table} (\n`;
              
              // Add columns
              const columns = schemaResult.rows.map(col => {
                let columnDef = `  ${col.column_name} ${col.data_type}`;
                
                // Add length for character types
                if (col.character_maximum_length && col.data_type.includes('char')) {
                  columnDef += `(${col.character_maximum_length})`;
                }
                
                // Add nullability
                columnDef += col.is_nullable === 'YES' ? '' : ' NOT NULL';
                
                return columnDef;
              });
              
              createTableSQL += columns.join(',\n');
              createTableSQL += '\n)';
              
              // Create the table
              await targetClient.query(createTableSQL);
              console.log(`✅ Created table '${table}' in target database`);
            } else {
              console.log(`✓ Table '${table}' already exists in target database`);
            }
          } finally {
            targetClient.release();
          }
        } finally {
          sourceClient.release();
        }
      } catch (error) {
        console.error(`❌ Error creating table '${table}':`, error.message);
      }
    }
    
    // Transfer data for each table
    console.log('\n📤 Transferring data...');
    for (const table of tables) {
      try {
        // Get data from source database
        const sourceClient = await sourcePool.connect();
        try {
          // First check if the table exists
          const tableExistsResult = await sourceClient.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_name = $1
            )
          `, [table]);
          
          if (!tableExistsResult.rows[0].exists) {
            console.log(`⚠️ Table '${table}' not found in source database, skipping...`);
            continue;
          }
          
          // Get data
          const dataResult = await sourceClient.query(`SELECT * FROM ${table}`);
          
          if (dataResult.rows.length === 0) {
            console.log(`ℹ️ No data in table '${table}', skipping...`);
            continue;
          }
          
          console.log(`📋 Transferring ${dataResult.rows.length} rows from '${table}'...`);
          
          // Clear existing data in target table
          const targetClient = await targetPool.connect();
          try {
            // Check if table exists in target
            const targetTableExistsResult = await targetClient.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = $1
              )
            `, [table]);
            
            if (!targetTableExistsResult.rows[0].exists) {
              console.log(`⚠️ Table '${table}' doesn't exist in target database, skipping...`);
              continue;
            }
            
            // Delete existing data
            await targetClient.query(`DELETE FROM ${table}`);
            
            // Get column names
            const columnsResult = await targetClient.query(`
              SELECT column_name
              FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = $1
              ORDER BY ordinal_position
            `, [table]);
            
            const columns = columnsResult.rows.map(row => row.column_name);
            
            // Insert data in batches
            const batchSize = 100;
            for (let i = 0; i < dataResult.rows.length; i += batchSize) {
              const batch = dataResult.rows.slice(i, i + batchSize);
              
              // Generate values placeholders
              const valuePlaceholders = batch.map((_, rowIndex) => 
                `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
              ).join(', ');
              
              // Flatten values array
              const values = batch.flatMap(row => 
                columns.map(col => row[col])
              );
              
              // Build and execute INSERT statement
              const insertSQL = `
                INSERT INTO ${table} (${columns.join(', ')})
                VALUES ${valuePlaceholders}
              `;
              
              await targetClient.query(insertSQL, values);
            }
            
            console.log(`✅ Transferred ${dataResult.rows.length} rows to '${table}'`);
          } finally {
            targetClient.release();
          }
        } finally {
          sourceClient.release();
        }
      } catch (error) {
        console.error(`❌ Error transferring data for table '${table}':`, error.message);
      }
    }
    
    console.log('\n🎉 Database transfer completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your DATABASE_URL in Vercel environment variables');
    console.log('2. Redeploy your application');
    
    return true;
  } catch (error) {
    console.error('❌ Database transfer failed:', error.message);
    return false;
  } finally {
    // Close the pools
    await sourcePool.end();
    await targetPool.end();
  }
}

// Run the transfer
transferDatabase().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});