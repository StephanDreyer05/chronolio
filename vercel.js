/**
 * Vercel deployment adapter
 * 
 * This file is used by Vercel to run the application in a serverless environment.
 * It directly exports the Express app for serverless functions.
 */

// Set environment variables for Vercel
process.env.VERCEL = 'true';
process.env.NODE_ENV = 'production';

import express from 'express';
// Use the compiled JavaScript paths (Vercel builds TS to JS)
import { registerRoutes } from './server/routes.js';
import aiRouter from './server/routes/ai.js';
import subscriptionRouter from './server/routes/subscription.js';
import { healthRoutes } from './server/routes/health.js';
import { setupAuth } from './server/auth.js';
import { sql } from 'drizzle-orm';
import cors from 'cors';
import { initializePaymentService, handleWebhookEvent } from './server/services/payment.js';

// Try to import the Vercel database configuration first
let db;
try {
  // Import Vercel-specific database configuration if it exists
  const { db: vercelDb } = await import('./db/vercel-db.js');
  db = vercelDb;
  console.log('[Vercel] Using Vercel-specific database configuration');
  
  // Try a simple database query to confirm connection
  try {
    const result = await db.execute(sql`SELECT NOW() as server_time`);
    console.log('[Vercel] Database connection verified:', result.rows[0]);
  } catch (testError) {
    console.error('[Vercel] Database connection test failed:', testError);
  }
} catch (error) {
  // Fall back to standard database import if the Vercel-specific one doesn't exist
  console.log('[Vercel] Falling back to standard database configuration, error:', error.message);
  
  try {
    const { db: standardDb } = await import('./db/index.js');
    db = standardDb;
    console.log('[Vercel] Using standard database configuration');
    
    // Try a simple database query to confirm connection
    try {
      const result = await db.execute(sql`SELECT NOW() as server_time`);
      console.log('[Vercel] Database connection verified:', result.rows[0]);
    } catch (testError) {
      console.error('[Vercel] Database connection test failed with standard config:', testError);
    }
  } catch (fallbackError) {
    console.error('[Vercel] Failed to load any database configuration:', fallbackError);
  }
}

// Create the Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API-specific headers
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Add debugging middleware
app.use((req, res, next) => {
  // Track overall request time
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 10);
  
  console.log(`[Vercel][${requestId}] ${req.method} ${req.url} started`);
  
  // Track when the response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[Vercel][${requestId}] ${req.method} ${req.url} completed with status ${res.statusCode} in ${duration}ms`);
  });
  
  // Track if the request errors out
  res.on('error', (error) => {
    const duration = Date.now() - start;
    console.error(`[Vercel][${requestId}] ${req.method} ${req.url} errored after ${duration}ms:`, error);
  });
  
  // Continue processing the request
  next();
});

// Share db with health routes for better diagnostics
global.db = db;

// Use our comprehensive health routes for detailed diagnostics
app.use('/api', healthRoutes);

// Improve error handling middleware to include more details
app.use((err, _req, res, _next) => {
  console.error('[Vercel] Error details:', {
    message: err.message,
    stack: err.stack,
    status: err.status || err.statusCode || 500,
    code: err.code,
    name: err.name
  });
  
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (!res.headersSent) {
    res.status(status).json({ 
      error: message,
      errorName: err.name,
      errorCode: err.code
    });
  }
});

// Initialize database and setup routes
let initialized = false;
app.use(async (req, res, next) => {
  if (initialized) {
    return next();
  }
  
  try {
    // 1. Check database connection
    console.log('[Vercel] Checking database connection...');
    try {
      const result = await db.execute(sql`SELECT 1 as db_check, current_schema() as schema`);
      console.log('[Vercel] Database connection successful:', result.rows[0]);
      
      // Try to check if the users table exists
      try {
        const tablesResult = await db.execute(sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name
        `);
        console.log('[Vercel] Available tables:', tablesResult.rows.map(r => r.table_name));
      } catch (tableError) {
        console.error('[Vercel] Error checking tables:', tableError);
      }
    } catch (dbError) {
      console.error('[Vercel] Database connection error:', dbError);
      // Don't continue if the DB connection fails
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: dbError.message
      });
    }
    
    // 2. Set up authentication
    console.log('[Vercel] Setting up authentication...');
    setupAuth(app);
    
    // 3. Set up AI router
    console.log('[Vercel] Setting up AI router...');
    app.use(aiRouter);
    
    // 4. Set up payment service
    console.log('[Vercel] Initializing payment service...');
    try {
      await initializePaymentService();
      console.log('[Vercel] Payment service initialized successfully');
    } catch (paymentError) {
      console.error('[Vercel] Error initializing payment service:', paymentError);
      // Continue initialization even if payment service fails
    }
    
    // 5. Set up subscription router
    console.log('[Vercel] Setting up subscription router...');
    app.use('/api/subscription', subscriptionRouter);
    
    // 6. Set up webhook endpoint
    console.log('[Vercel] Setting up webhook endpoint...');
    app.post('/webhooks', async (req, res) => {
      try {
        if (!req.body || !req.body.meta || !req.body.meta.event_name) {
          return res.status(400).json({ error: 'Invalid webhook payload format' });
        }
        
        const success = await handleWebhookEvent(req.body);
        
        if (!success) {
          return res.status(200).json({ 
            success: false, 
            message: 'Webhook received but processing failed. Event has been logged.' 
          });
        }
        
        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(200).json({ 
          success: false, 
          message: 'Webhook received but processing failed with error.' 
        });
      }
    });
    
    // 7. Register application routes from the main routes file
    console.log('[Vercel] Registering application routes...');
    registerRoutes(app);
    console.log('[Vercel] Routes registered successfully');
    
    initialized = true;
    console.log('[Vercel] Application initialization complete');
    next();
  } catch (error) {
    console.error('[Vercel] Error initializing app:', error);
    return res.status(500).json({ 
      error: 'Failed to initialize the application',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Export for Vercel serverless deployment
export default app;