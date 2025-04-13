/**
 * Vercel API route handler
 * 
 * This file is required for Vercel API Routes to work with Express.
 * It acts as the main entry point for all API requests in Vercel serverless environment.
 */

// Set environment variables for Vercel
process.env.VERCEL = 'true';
process.env.NODE_ENV = 'production';

// Import the Express app
import app from '../vercel.js';

// Export the handler for Vercel
export default app;