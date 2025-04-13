/**
 * Health check routes for API diagnostics
 * 
 * These routes provide detailed information about the application's health,
 * particularly focusing on database connectivity which is critical for
 * diagnosing Vercel deployment issues.
 */

import { Router } from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import os from 'os';
import { sql } from 'drizzle-orm';

// Create router
const router = Router();

// Basic health check route
router.get('/health', async (req, res) => {
  try {
    // Get package.json info for version reporting
    const packageInfo = getPackageInfo();

    // Basic system info
    const systemInfo = {
      hostname: os.hostname(),
      platform: process.platform,
      nodeVersion: process.version,
      uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV || 'development',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      date: new Date().toISOString()
    };

    // Check database connection
    const dbStatus = await checkDatabaseConnection();

    // Check for required environment variables
    const envVarsStatus = checkEnvironmentVariables();

    // Assemble the complete report
    const healthReport = {
      status: dbStatus.connected ? 'healthy' : 'unhealthy',
      version: packageInfo.version || 'unknown',
      name: packageInfo.name || 'Chronolio',
      system: systemInfo,
      database: dbStatus,
      environment: envVarsStatus,
      api: {
        endpoints: [
          '/api/health',
          '/api/health/database',
          '/api/health/detailed'
        ]
      }
    };

    res.json(healthReport);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Detailed database health check
router.get('/health/database', async (req, res) => {
  try {
    const dbStatus = await checkDatabaseConnection(true); // detailed mode
    res.json(dbStatus);
  } catch (error) {
    console.error('Database health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database health check failed',
      error: error.message
    });
  }
});

// Detailed system and diagnostic information (development only)
router.get('/health/detailed', async (req, res) => {
  // Only allow in development to prevent leaking sensitive info
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DETAILED_HEALTH) {
    return res.status(403).json({
      status: 'forbidden',
      message: 'Detailed health information is not available in production'
    });
  }

  try {
    // Get detailed environment information (excluding sensitive values)
    const safeEnvVars = getSafeEnvironmentVariables();
    
    // Get detailed OS information
    const detailedOsInfo = {
      platform: process.platform,
      arch: process.arch,
      release: os.release(),
      type: os.type(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      cpus: os.cpus().map(cpu => ({
        model: cpu.model,
        speed: cpu.speed
      }))
    };
    
    // Get detailed process information
    const processInfo = {
      pid: process.pid,
      ppid: process.ppid,
      title: process.title,
      argv: process.argv,
      execPath: process.execPath,
      execArgv: process.execArgv,
      version: process.version,
      versions: process.versions,
      uptime: process.uptime(),
      resourceUsage: process.resourceUsage(),
      memoryUsage: process.memoryUsage(),
      config: process.config,
      features: process.features,
      moduleLoadList: process.moduleLoadList
    };
    
    // Database connection info
    const dbStatus = await checkDatabaseConnection(true);
    
    // File system info - check important files
    const filesInfo = checkImportantFiles();
    
    res.json({
      timestamp: new Date().toISOString(),
      environment: safeEnvVars,
      os: detailedOsInfo,
      process: processInfo,
      database: dbStatus,
      files: filesInfo
    });
  } catch (error) {
    console.error('Detailed health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Detailed health check failed',
      error: error.message
    });
  }
});

/**
 * Helper function to check database connection
 * @param {boolean} detailed Whether to return detailed diagnostics
 * @returns {object} Database connection status
 */
async function checkDatabaseConnection(detailed = false) {
  // First try to use the existing db connection from global scope if available
  // This is for integration with the main Vercel.js file
  let dbFromParent;
  try {
    if (typeof global.db !== 'undefined' && global.db) {
      dbFromParent = global.db;
      console.log('[Health] Using global db connection');
    } else if (typeof db !== 'undefined' && db) {
      dbFromParent = db;
      console.log('[Health] Using local scope db connection');
    }
  } catch (e) {
    console.log('[Health] No db connection available from global or parent scope');
  }

  if (!process.env.DATABASE_URL) {
    return {
      connected: false,
      message: 'DATABASE_URL environment variable is not set'
    };
  }

  let pool;
  try {
    // Parse the connection string to get components for diagnostics
    const connectionInfo = parseConnectionString(process.env.DATABASE_URL);
    
    // If we have a db connection from parent scope, try to use that first
    if (dbFromParent) {
      try {
        const start = Date.now();
        await dbFromParent.execute(sql`SELECT NOW() as time`);
        const queryTime = Date.now() - start;
        
        console.log(`[Health] Successfully used existing db connection (${queryTime}ms)`);
        
        // Use the parent connection instead of creating a new pool
        // We'll simulate the pool methods needed by our checks
        return await performHealthCheck({
          connect: async () => ({
            query: async (queryStr) => {
              const result = await dbFromParent.execute(sql`${queryStr}`);
              return result;
            },
            release: () => {}
          }),
          end: async () => {}
        }, connectionInfo, detailed);
      } catch (parentDbError) {
        console.error('[Health] Error using parent db connection:', parentDbError);
        console.log('[Health] Falling back to direct connection');
        // Continue with creating a new pool below
      }
    }
    
    // Create connection pool with a short timeout
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('sslmode=require') 
        ? { rejectUnauthorized: false }
        : false,
      connectionTimeoutMillis: 5000, // 5 second timeout for health checks
      statement_timeout: 5000, // 5 second query timeout
      query_timeout: 5000 // 5 second query timeout
    });

    // Use our common health check function
    const result = await performHealthCheck(pool, connectionInfo, detailed);
    
    // Clean up pool
    try {
      await pool.end();
    } catch (err) {
      console.error('[Health] Error ending pool:', err);
    }
    
    return result;
  } catch (error) {
    if (pool) {
      try {
        await pool.end();
      } catch (endError) {
        console.error('Error ending pool:', endError);
      }
    }
    
    // Provide detailed error diagnostics
    const errorDetails = {
      connected: false,
      error: error.message,
      code: error.code,
      errorType: getErrorType(error),
      recommendation: getErrorRecommendation(error)
    };
    
    // Only add the full error and stack trace in detailed mode
    if (detailed) {
      errorDetails.fullError = error.toString();
      errorDetails.stack = error.stack;
      
      // Try to parse the connection string for diagnostics
      try {
        const connectionInfo = parseConnectionString(process.env.DATABASE_URL);
        errorDetails.connectionInfo = {
          host: connectionInfo.host || 'unknown',
          port: connectionInfo.port || 'default',
          database: connectionInfo.database || 'unknown',
          user: connectionInfo.user ? '✓ present' : 'missing',
          password: connectionInfo.password ? '✓ present' : 'missing',
          ssl: process.env.DATABASE_URL.includes('sslmode=require') ? 'enabled' : 'disabled',
          url: maskConnectionString(process.env.DATABASE_URL)
        };
      } catch (parseError) {
        errorDetails.connectionParseError = parseError.message;
      }
    }
    
    return errorDetails;
  }
}

/**
 * Get package.json information
 * @returns {object} Package info or empty object if not found
 */
function getPackageInfo() {
  try {
    const packagePath = path.resolve('./package.json');
    if (fs.existsSync(packagePath)) {
      const content = fs.readFileSync(packagePath, 'utf8');
      return JSON.parse(content);
    }
    return {};
  } catch (error) {
    console.error('Error reading package.json:', error);
    return {};
  }
}

/**
 * Check for required environment variables
 * @returns {object} Status of environment variables
 */
function checkEnvironmentVariables() {
  const requiredVars = ['DATABASE_URL', 'SESSION_SECRET'];
  const optionalVars = ['LEMONSQUEEZY_API_KEY', 'OPENAI_API_KEY'];
  
  const status = {
    requiredVariables: {},
    optionalVariables: {}
  };
  
  // Check required vars
  for (const varName of requiredVars) {
    status.requiredVariables[varName] = process.env[varName] ? 'present' : 'missing';
  }
  
  // Check optional vars
  for (const varName of optionalVars) {
    status.optionalVariables[varName] = process.env[varName] ? 'present' : 'missing';
  }
  
  return status;
}

/**
 * Get a safe subset of environment variables (excluding secrets)
 * @returns {object} Safe environment variables
 */
function getSafeEnvironmentVariables() {
  const safeEnv = {};
  const sensitiveKeys = [
    'DATABASE_URL', 'SESSION_SECRET', 'PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'AUTH'
  ];
  
  for (const [key, value] of Object.entries(process.env)) {
    // Skip anything that might contain sensitive information
    if (sensitiveKeys.some(sensitiveKey => 
      key.toUpperCase().includes(sensitiveKey.toUpperCase()))) {
      safeEnv[key] = '[REDACTED]';
    } else {
      safeEnv[key] = value;
    }
  }
  
  return safeEnv;
}

/**
 * Check if important files exist
 * @returns {object} Status of important files
 */
function checkImportantFiles() {
  const filesToCheck = [
    './vercel.js', 
    './api/index.js', 
    './vercel.json', 
    './package.json',
    './db/schema.ts',
    './db/vercel-db.js'
  ];
  
  const fileStatus = {};
  
  for (const filePath of filesToCheck) {
    try {
      const fullPath = path.resolve(filePath);
      const exists = fs.existsSync(fullPath);
      const stats = exists ? fs.statSync(fullPath) : null;
      
      fileStatus[filePath] = {
        exists,
        size: exists ? stats.size : null,
        mtime: exists ? stats.mtime.toISOString() : null
      };
    } catch (error) {
      fileStatus[filePath] = {
        exists: false,
        error: error.message
      };
    }
  }
  
  return fileStatus;
}

/**
 * Parse a PostgreSQL connection string into components
 * @param {string} connectionString The PostgreSQL connection string
 * @returns {object} The parsed components
 */
function parseConnectionString(connectionString) {
  try {
    // Basic regex to extract parts of the connection string
    // Example format: postgresql://username:password@host:port/database?params
    const regex = /^postgresql:\/\/(?:([^:]+)(?::([^@]*))?@)?([^:\/]+)(?::(\d+))?\/([^?]+)(?:\?(.*))?$/;
    const match = connectionString.match(regex);
    
    if (!match) {
      return {
        valid: false,
        error: 'Invalid connection string format'
      };
    }
    
    return {
      valid: true,
      user: match[1] || null,
      password: match[2] ? 'provided' : null,
      host: match[3] || null,
      port: match[4] || '5432',
      database: match[5] || null,
      params: match[6] || null
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Mask a connection string to hide sensitive information
 * @param {string} connectionString The connection string to mask
 * @returns {string} The masked connection string
 */
function maskConnectionString(connectionString) {
  if (!connectionString) return 'not_provided';
  
  try {
    // Replace the password with asterisks
    return connectionString.replace(
      /(postgresql:\/\/[^:]+:)([^@]+)(@.*)/,
      '$1********$3'
    );
  } catch (error) {
    return 'invalid_connection_string';
  }
}

/**
 * Categorize database error by type
 * @param {Error} error The error object
 * @returns {string} Error type category
 */
function getErrorType(error) {
  if (!error) return 'unknown';
  
  // Network errors
  if (error.code === 'ENOTFOUND') return 'hostname_not_found';
  if (error.code === 'ECONNREFUSED') return 'connection_refused';
  if (error.code === 'ETIMEDOUT') return 'connection_timeout';
  
  // Authentication errors
  if (error.code === '28P01') return 'authentication_failed';
  if (error.code === '28000') return 'invalid_authorization_specification';
  
  // Database errors
  if (error.code === '3D000') return 'database_not_found';
  if (error.code === '42P01') return 'relation_not_found';
  
  // Connection errors
  if (error.code === '08006') return 'connection_failure';
  if (error.code === '08001') return 'sqlclient_unable_to_establish_sqlconnection';
  if (error.code === '08004') return 'connection_rejected';
  
  // SSL errors
  if (error.message && error.message.includes('SSL')) return 'ssl_error';
  
  // Fallback
  return 'unknown_database_error';
}

/**
 * Get recommendations based on the error type
 * @param {Error} error The error object
 * @returns {string} Recommendation
 */
function getErrorRecommendation(error) {
  if (!error) return 'Verify database connection parameters';
  
  const errorType = getErrorType(error);
  
  switch (errorType) {
    case 'hostname_not_found':
      return 'The database hostname could not be resolved. Check your DATABASE_URL and ensure the hostname is correct.';
    
    case 'connection_refused':
      return 'The database server actively refused the connection. Verify the host and port are correct, and check if any firewall is blocking the connection.';
    
    case 'connection_timeout':
      return 'The connection timed out. The database server might be unreachable or behind a restrictive firewall.';
    
    case 'authentication_failed':
      return 'Invalid username or password. Check your credentials in the DATABASE_URL.';
    
    case 'invalid_authorization_specification':
      return 'Authentication issue. Check that the user has permission to access the database.';
    
    case 'database_not_found':
      return 'The specified database does not exist. Create the database or check the name in your DATABASE_URL.';
    
    case 'relation_not_found':
      return 'Table or relation not found. Run database migrations to create the required tables.';
    
    case 'ssl_error':
      return 'SSL connection issue. Try modifying the DATABASE_URL to include or exclude ?sslmode=require depending on your database provider.';
    
    case 'connection_failure':
    case 'sqlclient_unable_to_establish_sqlconnection':
    case 'connection_rejected':
      return 'Could not establish a connection to the database. Check your connection parameters and network settings.';
    
    default:
      return 'Check your DATABASE_URL, ensure the database exists, and verify network connectivity to the database server.';
  }
}

/**
 * Helper function to perform health check with a given pool
 * @param {Pool} pool The database connection pool
 * @param {Object} connectionInfo The parsed connection info
 * @param {boolean} detailed Whether to return detailed diagnostics
 * @returns {object} Database connection status
 */
async function performHealthCheck(pool, connectionInfo, detailed = false) {
  try {
    // Test the connection
    const start = Date.now();
    const client = await pool.connect();
    const queryTime = Date.now() - start;
    
    // Run a simple query to verify database functionality
    const queryStart = Date.now();
    const result = await client.query('SELECT NOW() as time, current_database() as database, current_user as user');
    const queryExecutionTime = Date.now() - queryStart;
    
    client.release();
    
    // Build the response
    const dbInfo = {
      connected: true,
      connectionTime: queryTime,
      queryTime: queryExecutionTime,
      time: result.rows[0].time,
      database: result.rows[0].database,
      user: result.rows[0].user
    };
    
    // Add detailed connection info if requested
    if (detailed) {
      dbInfo.connection = {
        host: connectionInfo.host || 'unknown',
        port: connectionInfo.port || 'default',
        database: connectionInfo.database || 'unknown',
        user: connectionInfo.user ? '✓ present' : 'missing',
        password: connectionInfo.password ? '✓ present' : 'missing',
        ssl: process.env.DATABASE_URL.includes('sslmode=require') ? 'enabled' : 'disabled',
        url: maskConnectionString(process.env.DATABASE_URL)
      };
      
      // Check database tables
      try {
        const client = await pool.connect();
        const tablesResult = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name
        `);
        client.release();
        
        dbInfo.tables = tablesResult.rows.map(row => row.table_name);
        dbInfo.tableCount = tablesResult.rows.length;
      } catch (error) {
        dbInfo.tablesError = error.message;
      }
    }
    
    return dbInfo;
  } catch (error) {
    // Provide detailed error diagnostics
    const errorDetails = {
      connected: false,
      error: error.message,
      code: error.code,
      errorType: getErrorType(error),
      recommendation: getErrorRecommendation(error)
    };
    
    // Only add the full error and stack trace in detailed mode
    if (detailed) {
      errorDetails.fullError = error.toString();
      errorDetails.stack = error.stack;
      
      errorDetails.connectionInfo = {
        host: connectionInfo.host || 'unknown',
        port: connectionInfo.port || 'default',
        database: connectionInfo.database || 'unknown',
        user: connectionInfo.user ? '✓ present' : 'missing',
        password: connectionInfo.password ? '✓ present' : 'missing',
        ssl: process.env.DATABASE_URL.includes('sslmode=require') ? 'enabled' : 'disabled',
        url: maskConnectionString(process.env.DATABASE_URL)
      };
    }
    
    return errorDetails;
  }
}

export { router as healthRoutes };