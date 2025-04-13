#!/bin/bash

# Script to directly modify the vite configuration with the required host
echo "Applying direct Vite fix for Replit host..."

# Create src symlink if needed
if [ ! -L "src" ]; then
  echo "Creating symlink from client/src to src"
  rm -rf src
  ln -sf client/src src
fi

# Set environment variables for Replit
export REPLIT_ENVIRONMENT=true
export REPL_ID=$(hostname)
export VITE_DEV_SERVER_HOST="0.0.0.0"
export VITE_DEV_SERVER_PORT=5000

# Create a temporary file to directly override the vite configuration
echo "Creating direct server configuration..."
mkdir -p server/config

# Create a direct host configuration file
cat > server/config/allowed-hosts.js << 'EOF'
/**
 * Vite server allowed hosts configuration
 * Manually created for Replit deployment
 */

// Specific known Replit host from error message
export const SPECIFIC_REPLIT_HOST = "46bfefbe-87e0-47ab-a4cd-257bbfc52f52-00-lgtzqxecujzm.riker.replit.dev";

// All Replit hosts that should be allowed
export const allowedHosts = [
  SPECIFIC_REPLIT_HOST,
  true, // Allow all hosts
  "*.replit.dev",
  "*.riker.replit.dev"
];

// Export for use in Vite configuration
export default allowedHosts;
EOF

# Find and modify server/vite.ts to use direct host configuration
echo "Finding and modifying vite configuration..."

# Create a backup of the original vite.ts
cp server/vite.ts server/vite.ts.backup

# Create vite config override
cat > server/vite-override.js << 'EOF'
/**
 * Direct Vite server configuration override
 * This file will be used instead of the original vite.ts
 */

import { createServer } from "http";
import express from "express";
import { createLogger, createServer as createViteServer } from "vite";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 5000;
const app = express();
const server = createServer(app);

// Create and configure Vite server with direct access to config
async function createDevServer() {
  // Special configuration for Replit
  const specificHost = "46bfefbe-87e0-47ab-a4cd-257bbfc52f52-00-lgtzqxecujzm.riker.replit.dev";
  
  // Create Vite with explicit configuration
  const vite = await createViteServer({
    root: path.resolve(__dirname, '../client'),
    base: '/',
    server: {
      middlewareMode: true,
      hmr: { 
        server,
        clientPort: 443,
        host: specificHost,
      },
      host: true,
      port: 5000,
      strictPort: true,
      allowedHosts: [
        specificHost,
        true, // Allow all hosts
        "*.replit.dev",
        "*.riker.replit.dev"
      ]
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  
  // Handle SPA routing
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Check if the request is for an HTML page
    if (url.endsWith("/") || url.endsWith(".html") || !path.extname(url)) {
      try {
        // Resolve index.html 
        const clientRoot = path.resolve(__dirname, "../client"); 
        const clientIndexHtml = path.resolve(clientRoot, "index.html");
        
        // Read the original index.html template
        let template = await fs.promises.readFile(clientIndexHtml, "utf-8");
        
        // Apply Vite transformations
        template = await vite.transformIndexHtml(url, template);
        
        // Send the transformed HTML
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        // If an error occurs, pass it to the next error handler
        vite.ssrFixStacktrace(e);
        next(e);
      }
    } else {
      // For non-HTML requests, let other middleware handle it
      next();
    }
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server with direct Replit host fix running at http://0.0.0.0:${port}`);
  });
}

createDevServer();
EOF

# Create a script to run the overridden configuration
echo "Creating dev runner script..."
cat > dev-direct-override.js << 'EOF'
/**
 * Direct development server runner with Replit host fixes
 */

// Sets environment variables
process.env.REPLIT_ENVIRONMENT = 'true';
process.env.PORT = '5000';
process.env.VITE_DEV_SERVER_HOST = '0.0.0.0';
process.env.VITE_DEV_SERVER_PORT = '5000';

// Run the server with direct configuration
import("./server/vite-override.js")
  .then(() => {
    console.log("Development server with Replit fixes started");
  })
  .catch(err => {
    console.error("Failed to start development server:", err);
    process.exit(1);
  });
EOF

echo "Starting the development server with direct fixes..."
node --experimental-specifier-resolution=node --experimental-modules dev-direct-override.js