import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { serveStatic, log } from "./vite.js";
import aiRouter from "./routes/ai.js";
import subscriptionRouter from "./routes/subscription.js";
import { setupAuth } from "./auth.js";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import cors from "cors";
import { initializePaymentService, handleWebhookEvent } from "./services/payment.js";
import path from "path";

// Create an Express app instance
export const app = express();
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

// Verify database connection before proceeding
async function initializeApp() {
  try {
    // 1. Database Connection Check
    log('Step 1/6: Checking database connection...');
    await db.execute(sql`SELECT 1`);
    log('Database connection verified successfully');

    // 2. Authentication Setup
    log('Step 2/6: Setting up authentication...');
    setupAuth(app);
    log('Authentication setup completed');

    // 3. AI Router Setup
    log('Step 3/6: Setting up AI router...');
    app.use(aiRouter);
    log('AI router setup completed');
    
    // 4. Payment Service Setup
    log('Step 4/6: Setting up payment service...');
    const paymentServiceInitialized = await initializePaymentService();
    log(`Payment service ${paymentServiceInitialized ? 'initialized successfully' : 'initialization failed'}`);
    
    // 5. Subscription Router Setup
    log('Step 5/6: Setting up subscription router...');
    app.use('/api/subscription', subscriptionRouter);
    
    // Also set up the webhook endpoint at /webhooks as requested by the user
    app.post('/webhooks', async (req, res) => {
      try {
        console.log('Received webhook request at /webhooks endpoint');
        
        // Basic verification that this is a valid webhook request
        if (!req.body || !req.body.meta || !req.body.meta.event_name) {
          console.error('Invalid webhook payload format');
          return res.status(400).json({ error: 'Invalid webhook payload format' });
        }
        
        // Log the event type
        console.log(`Processing webhook event: ${req.body.meta.event_name}`);
        
        // Process the webhook event
        const success = await handleWebhookEvent(req.body);
        
        if (!success) {
          console.error('Failed to process webhook event');
          // Return 200 to payment provider so it doesn't retry (we've logged the issue)
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
    
    log('Subscription router setup completed');

    // 6. Route Registration
    log('Step 6/6: Registering application routes...');
    registerRoutes(app);
    log('Route registration completed');

    // Setup static file serving for Vercel
    app.use(express.static(path.join(process.cwd(), 'dist/public')));
    
    // Handle client-side routing - serve index.html for any other routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist/public/index.html'));
    });

    log('✓ App initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Fatal error during app initialization:', error);
    return false;
  }
}

// Initialize if not in Vercel's serverless environment
if (process.env.NODE_ENV === 'development' || !process.env.VERCEL) {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  initializeApp().then(success => {
    if (success) {
      app.listen(PORT, '0.0.0.0', () => {
        log(`✨ Server successfully started and listening on port ${PORT}`);
      });
    } else {
      log('❌ Server failed to initialize properly');
      process.exit(1);
    }
  });
} else {
  // For Vercel, initialize on first request
  let initialized = false;
  app.use(async (req, res, next) => {
    if (!initialized) {
      initialized = await initializeApp();
      if (!initialized) {
        return res.status(500).json({ error: 'Failed to initialize the application' });
      }
    }
    next();
  });
}

// Export for Vercel serverless deployment
export default app;