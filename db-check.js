/**
 * Database check script to validate the public_timeline_shares table
 * 
 * Run with: node db-check.js
 */

// Import required dependencies
const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Function to connect to the database
function connectToDb() {
  try {
    // Determine which database to connect to
    const dbUrl = process.env.DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN;
    
    if (!dbUrl) {
      console.error('Error: DATABASE_URL is missing in environment variables');
      process.exit(1);
    }
    
    const client = createClient({
      url: dbUrl,
      authToken: authToken
    });
    
    console.log('Successfully connected to the database');
    return client;
  } catch (error) {
    console.error('Error connecting to the database:', error);
    process.exit(1);
  }
}

async function checkSchema() {
  console.log('Checking database schema...');
  
  try {
    const db = connectToDb();
    
    // Check if the public_timeline_shares table exists
    console.log('\nChecking public_timeline_shares table:');
    const tableExists = await db.execute({
      sql: `SELECT name FROM sqlite_master WHERE type='table' AND name='public_timeline_shares'`
    });
    
    if (tableExists.rows.length === 0) {
      console.error('❌ Table public_timeline_shares does not exist!');
      console.log('Run migrations to create the table:');
      console.log('  1. Make sure you have the migration file for public_timeline_shares');
      console.log('  2. Run: npx drizzle-kit migrate');
      process.exit(1);
    }
    
    console.log('✅ Table public_timeline_shares exists');
    
    // Get column information
    const columns = await db.execute({
      sql: `PRAGMA table_info(public_timeline_shares)`
    });
    
    console.log('\nColumns in public_timeline_shares:');
    const columnMap = {};
    
    columns.rows.forEach(col => {
      columnMap[col.name] = {
        type: col.type,
        notNull: col.notnull === 1,
        defaultValue: col.dflt_value,
        isPrimaryKey: col.pk === 1
      };
      
      console.log(`- ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
    });
    
    // Verify required columns
    const requiredColumns = [
      { name: 'id', type: /INTEGER|int/i, notNull: true, isPrimaryKey: true },
      { name: 'timeline_id', type: /INTEGER|int/i, notNull: true },
      { name: 'share_token', type: /TEXT|varchar|string/i, notNull: true },
      { name: 'is_enabled', type: /BOOLEAN|bool|INTEGER|int/i, notNull: true },
      { name: 'created_at', type: /TIMESTAMP|datetime/i, notNull: false },
      { name: 'updated_at', type: /TIMESTAMP|datetime/i, notNull: false },
      { name: 'expires_at', type: /TIMESTAMP|datetime/i, notNull: false }
    ];
    
    console.log('\nVerifying required columns:');
    let schemaValid = true;
    
    for (const required of requiredColumns) {
      const column = columnMap[required.name];
      
      if (!column) {
        console.error(`❌ Missing column: ${required.name}`);
        schemaValid = false;
        continue;
      }
      
      const typeMatches = required.type.test(column.type);
      if (!typeMatches) {
        console.error(`❌ Column ${required.name} has wrong type: ${column.type} (expected: ${required.type})`);
        schemaValid = false;
      }
      
      if (required.notNull && !column.notNull) {
        console.error(`❌ Column ${required.name} should be NOT NULL`);
        schemaValid = false;
      }
      
      if (required.isPrimaryKey && !column.isPrimaryKey) {
        console.error(`❌ Column ${required.name} should be PRIMARY KEY`);
        schemaValid = false;
      }
      
      if (typeMatches && (!required.notNull || column.notNull) && (!required.isPrimaryKey || column.isPrimaryKey)) {
        console.log(`✅ Column ${required.name} is valid`);
      }
    }
    
    // Check for foreign key constraint
    const foreignKeys = await db.execute({
      sql: `PRAGMA foreign_key_list('public_timeline_shares')`
    });
    
    console.log('\nForeign key constraints:');
    let hasTimelineIdForeignKey = false;
    
    for (const fk of foreignKeys.rows) {
      console.log(`- ${fk.from} references ${fk.table}.${fk.to}`);
      if (fk.from === 'timeline_id' && fk.table === 'timelines' && fk.to === 'id') {
        hasTimelineIdForeignKey = true;
      }
    }
    
    if (!hasTimelineIdForeignKey) {
      console.error('❌ Missing foreign key constraint: timeline_id should reference timelines.id');
      schemaValid = false;
    } else {
      console.log('✅ Foreign key constraint on timeline_id is valid');
    }
    
    if (schemaValid) {
      console.log('\n✅ Schema validation passed! The public_timeline_shares table is correctly configured.');
    } else {
      console.error('\n❌ Schema validation failed! Please fix the issues above and try again.');
    }
    
    // Check for existing shares
    const shares = await db.execute({
      sql: `SELECT * FROM public_timeline_shares LIMIT 5`
    });
    
    console.log('\nExisting shares (up to 5):');
    if (shares.rows.length === 0) {
      console.log('No shares found in the database.');
    } else {
      shares.rows.forEach(share => {
        console.log(share);
      });
    }
    
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

// Run the check
checkSchema().catch(console.error); 