/**
 * Direct Server implementation that combines Express and Vite
 * with Replit host fixes
 */

// Import required modules
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Logging utility
function log(message, source = "express") {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [${source}] ${message}`);
}

async function startServer() {
  log("Starting direct server with Replit host support...");
  
  // Create Vite server with full configuration
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: {
        port: 5173,
        clientPort: 443,
        protocol: 'wss',
      },
      host: '0.0.0.0',
      strictPort: false,
      watch: {
        usePolling: true,
        interval: 1000,
      },
    },
    root: process.cwd(),
    base: '/',
    publicDir: 'public',
    clearScreen: false,
    logLevel: 'info',
    // Configure aliases that match those in vite.config.ts
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'client/src'),
        '@db': path.resolve(process.cwd(), 'db'),
        '@server': path.resolve(process.cwd(), 'server'),
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
  });

  log("Vite middleware configured successfully");
  
  // Get hostname for Replit
  const hostname = process.env.REPL_SLUG ? 
    `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 
    'localhost';
  
  log(`Hostname detected: ${hostname}`);
  
  // Apply Express middleware
  app.use(express.json({ limit: '50mb' }));
  log("Express middleware configured");
  
  // Apply Vite middleware to Express
  app.use(vite.middlewares);
  log("Vite middleware applied");
  
  // Start the Express server with Replit host support
  app.listen(PORT, '0.0.0.0', () => {
    log(`✨ Server running at http://localhost:${PORT}`);
    log(`✨ Server also available at your Replit domain`);
    
    // Detect if we're in a CI environment and avoid npm processes
    if (!process.env.CI) {
      // Start the real backend server to handle API requests
      log("Starting the API server...");
      const apiProcess = spawn('node', ['-r', 'tsx/register', 'server/index.ts'], { 
        stdio: 'inherit',
        env: { 
          ...process.env, 
          VITE_DIRECT_SERVER: 'true',
          PORT: '5001' // Run API server on a different port
        }
      });
      
      apiProcess.on('error', (err) => {
        log(`API server error: ${err.message}`, "api");
      });
      
      apiProcess.on('close', (code) => {
        log(`API server process exited with code ${code}`, "api");
      });
    }
  });
}

// Start the server
startServer().catch((err) => {
  log(`Failed to start server: ${err.stack}`, "error");
});