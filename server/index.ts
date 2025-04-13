import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import aiRouter from "./routes/ai.js";
import subscriptionRouter from "./routes/subscription.js";
import { setupAuth } from "./auth.js";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import cors from "cors";
import { initializePaymentService, handleWebhookEvent } from "./services/payment.js";
import path from "path";
import dotenv from 'dotenv';
import { initializeEmailService } from './services/email.js';
import { initializeS3Service } from './services/s3Service.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Early middleware to ensure API routes are handled correctly
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (!res.headersSent) {
    res.status(status).json({ error: message });
  }
});

// Initialize services
async function initializeServices() {
  console.log('Initializing app services...');
  
  // Initialize email service
  const emailResult = initializeEmailService();
  console.log('Email service initialization:', emailResult ? 'Success' : 'Failed');
  
  // Initialize payment service
  const paymentResult = await initializePaymentService();
  console.log('Payment service initialization:', paymentResult ? 'Success' : 'Failed');
  
  // Initialize S3 service
  const s3Result = await initializeS3Service();
  console.log('S3 service initialization:', s3Result ? 'Success' : 'Failed');
}

// Verify database connection before proceeding
async function startServer() {
  try {
    // 1. Database Connection Check
    log('Step 1/7: Checking database connection...');
    await db.execute(sql`SELECT 1`);
    log('Database connection verified successfully');

    // 2. Authentication Setup
    log('Step 2/7: Setting up authentication...');
    setupAuth(app);
    log('Authentication setup completed');

    // 3. AI Router Setup
    log('Step 3/7: Setting up AI router...');
    app.use(aiRouter);
    log('AI router setup completed');
    
    // 4. Payment Service Setup
    log('Step 4/7: Setting up payment service...');
    // Initialize all services including email and S3
    await initializeServices();
    log('Service initialization completed');
    
    // 5. Subscription Router Setup
    log('Step 5/7: Setting up subscription router...');
    app.use('/api/subscription', subscriptionRouter);
    
    // Also set up the webhook endpoint at /webhooks as requested by the user
    app.post('/webhooks', async (req, res) => {
      try {
        console.log('Received webhook request at /webhooks endpoint');
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Body:', JSON.stringify(req.body, null, 2));
        
        // Basic verification that this is a valid webhook request
        if (!req.body || !req.body.meta || !req.body.meta.event_name) {
          console.error('Invalid webhook payload format');
          return res.status(400).json({ error: 'Invalid webhook payload format' });
        }
        
        // Log the event type
        console.log(`Processing webhook event: ${req.body.meta.event_name}`);
        
        // Verify webhook signature if available
        const signature = req.headers['x-signature'];
        if (signature) {
          console.log('Webhook signature received:', signature);
        } else {
          console.log('No webhook signature found in request headers');
        }
        
        // Process the webhook event
        const success = await handleWebhookEvent(req.body);
        
        if (!success) {
          console.error('Failed to process webhook event');
          // Return 200 to Lemon Squeezy so it doesn't retry (we've logged the issue)
          return res.status(200).json({ 
            success: false, 
            message: 'Webhook received but processing failed. Event has been logged.' 
          });
        }
        
        console.log('Webhook processed successfully');
        res.status(200).json({ success: true });
      } catch (error: any) {
        console.error('Error processing webhook:', error);
        // Return 200 to avoid retries, but log the error
        res.status(200).json({ 
          success: false, 
          message: 'Webhook received but processing failed with error. Event has been logged.' 
        });
      }
    });
    
    // Add S3 test endpoint
    app.get('/api/s3/test', async (req, res) => {
      try {
        // Import the S3 service
        const s3Service = (await import('./services/s3Service.js')).default;
        
        // Test the S3 connection
        const testResult = await s3Service.testConnection();
        
        // Return the test result
        res.json(testResult);
      } catch (error) {
        console.error('Error testing S3 connection:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to test S3 connection',
          error: error.message
        });
      }
    });
    
    log('Subscription router setup completed');

    // 6. Route Registration
    log('Step 6/7: Registering application routes...');
    const server = registerRoutes(app);
    log('Route registration completed');

    // 7. Setup Frontend Serving - Conditional based on NODE_ENV
    log('Step 7/7: Setting up frontend serving...');
    try {
      if (process.env.NODE_ENV === 'production') {
        log('Using static serving for production');
        serveStatic(app);
        log('Static serving setup completed');
      } else {
        log('Using Vite for development');
        await setupVite(app, server);
        log('Vite setup completed');
      }
    } catch (error) {
      console.error('Fatal error during frontend setup:', error);
      process.exit(1);
    }

    // Start the server
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
    server.listen(PORT, '0.0.0.0', () => {
      log(`✨ Server successfully started and listening on port ${PORT}`);
    });

  } catch (error) {
    console.error('Fatal error during server startup:', error);
    process.exit(1);
  }
}

log('Beginning server initialization...');
startServer().catch(error => {
  console.error('Fatal error during server startup:', error);
  process.exit(1);
});