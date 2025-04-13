#!/bin/bash

# start-with-path-redirect.sh: Start the application with path redirection middleware
# This script starts the application with custom middleware that redirects /src/* requests to /client/src/*
# Author: Replit AI Assistant
# Date: March 30, 2025

echo "=== Starting Application with Path Redirection ==="

# Make sure the direct-vite-redirect.js file exists
if [ ! -f "direct-vite-redirect.js" ]; then
  echo "❌ direct-vite-redirect.js not found. Please make sure it exists."
  exit 1
fi

# Create a temporary index.js file that uses our custom middleware
echo "Creating temporary server entry point with redirection middleware..."

cat > temp-server-index.js << EOF
// Temporary server entry point with path redirection middleware
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import { createViteRedirectMiddleware, createFileSystemRedirectMiddleware, checkPathsExistence } from './direct-vite-redirect.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
  const app = express();
  
  console.log('📊 Starting server with path redirection middleware...');
  
  // Check file paths existence (debugging)
  checkPathsExistence();
  
  // Add the redirection middleware BEFORE vite middleware
  app.use(createViteRedirectMiddleware());
  app.use(createFileSystemRedirectMiddleware());
  
  // Create Vite server
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      host: '0.0.0.0'
    },
    appType: 'spa',
    root: process.cwd(),
  });
  
  // Use vite's connect instance as middleware
  app.use(vite.middlewares);
  
  // Fallback for SPA routing
  app.use('*', async (req, res) => {
    // Redirect non-API requests to index.html for SPA routing
    if (!req.originalUrl.startsWith('/api')) {
      try {
        const indexHtml = path.resolve(process.cwd(), 'client', 'index.html');
        let template = await vite.transformIndexHtml(req.originalUrl, fs.readFileSync(indexHtml, 'utf-8'));
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        console.error(e);
        res.status(500).end(e.message);
      }
    } else {
      res.status(404).end();
    }
  });
  
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(\`🚀 Server running at http://localhost:\${port}\`);
  });
}

createServer().catch((err) => {
  console.error('❌ Error starting server:', err);
});
EOF

echo "Starting server with redirection middleware..."
node --experimental-modules temp-server-index.js