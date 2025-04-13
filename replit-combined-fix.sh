#!/bin/bash

# replit-combined-fix.sh: Combined approach to fix Replit deployment issues
# This script:
# 1. Creates a physical copy of client/src in src
# 2. Modifies the server startup to handle path resolution
# 3. Provides comprehensive logging for debugging
# Author: Replit AI Assistant
# Date: March 30, 2025

echo "=== REPLIT COMBINED FIX SCRIPT ==="
echo "Starting comprehensive fix for Replit deployment..."

# Step 1: Physical directory copy
echo "Step 1/3: Creating physical src directory from client/src..."

if [ -d "src" ] || [ -L "src" ]; then
  echo "  Removing existing src directory or symlink..."
  rm -rf src
fi

echo "  Creating new src directory..."
mkdir -p src

echo "  Copying files from client/src to src..."
cp -R client/src/* src/

# Verify the copy
if [ -f "src/main.tsx" ]; then
  echo "  ✅ Copy successful! src/main.tsx exists."
else
  echo "  ❌ Copy failed! src/main.tsx not found."
  echo "  Detailed directory listing:"
  find client -type f -name "*.tsx" | sort
  echo "  Exiting due to copy failure."
  exit 1
fi

# Step 2: Create temporary patched server file
echo "Step 2/3: Creating patched server startup file..."

cat > temp-replit-server.js << EOF
// Temporary patched server for Replit deployment
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to check file existence with clear logging
function checkFilePath(filePath, description) {
  const exists = fs.existsSync(filePath);
  console.log(\`\${description}: \${exists ? '✅ EXISTS' : '❌ MISSING'} (\${filePath})\`);
  return exists;
}

async function startServer() {
  try {
    console.log("🔍 Environment check:");
    console.log("  Current working directory:", process.cwd());
    console.log("  NODE_ENV:", process.env.NODE_ENV);
    
    // Verify critical files
    console.log("🔍 File check:");
    checkFilePath(path.join(process.cwd(), 'src', 'main.tsx'), 'src/main.tsx');
    checkFilePath(path.join(process.cwd(), 'client', 'src', 'main.tsx'), 'client/src/main.tsx');
    checkFilePath(path.join(process.cwd(), 'client', 'index.html'), 'client/index.html');
    
    // Start the Express app
    const app = express();
    
    // Create Vite dev server
    console.log("🛠 Creating Vite dev server...");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        hmr: {
          port: 24678,
          clientPort: 443,
          host: process.env.REPL_SLUG ? \`\${process.env.REPL_SLUG}.id.replit.dev\` : undefined,
        }
      },
      appType: 'spa',
      // Use the root directory which contains both 'client' and 'src'
      root: process.cwd(),
    });
    
    console.log("🔄 Setting up middleware...");
    
    // Special middleware to handle /src/* file requests
    app.use((req, res, next) => {
      if (req.method === 'GET' && req.url.startsWith('/src/')) {
        console.log(\`Intercepted request to \${req.url}\`);
        
        const srcPath = path.join(process.cwd(), req.url);
        const clientSrcPath = path.join(process.cwd(), 'client', req.url);
        
        if (fs.existsSync(srcPath)) {
          console.log(\`Serving file from src directory: \${srcPath}\`);
          res.sendFile(srcPath);
          return;
        } else if (fs.existsSync(clientSrcPath)) {
          console.log(\`Redirecting to client/src: \${clientSrcPath}\`);
          res.sendFile(clientSrcPath);
          return;
        } else {
          console.log(\`File not found in either location: \${req.url}\`);
        }
      }
      next();
    });
    
    // Apply Vite middleware
    app.use(vite.middlewares);
    
    // Fallback for SPA routing
    app.use('*', async (req, res, next) => {
      try {
        const indexPath = path.join(process.cwd(), 'client', 'index.html');
        if (fs.existsSync(indexPath)) {
          let html = fs.readFileSync(indexPath, 'utf-8');
          html = await vite.transformIndexHtml(req.originalUrl, html);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        } else {
          next();
        }
      } catch (e) {
        vite.ssrFixStacktrace(e);
        console.error(e);
        res.status(500).end(e.message);
      }
    });
    
    // Start the server
    const port = process.env.PORT || 5000;
    const server = createServer(app);
    
    server.listen(port, '0.0.0.0', () => {
      console.log(\`🚀 Server running at http://localhost:\${port}\`);
      console.log(\`🌐 For Replit access, use your .replit.dev domain\`);
    });
    
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
}

startServer();
EOF

# Step 3: Start the server with our custom patched file
echo "Step 3/3: Starting server with patched configuration..."
echo "  Running node with ESM support..."
exec node --experimental-modules temp-replit-server.js