// direct-vite-redirect.js
// A custom Express middleware that redirects /src/* requests to /client/src/*

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates a middleware that redirects requests from /src to /client/src
 * This is a workaround for Vite's resolution issues in Replit
 */
export function createViteRedirectMiddleware() {
  console.log('📦 Setting up Vite path redirection middleware...');
  
  return (req, res, next) => {
    // Only intercept GET requests to /src/* paths
    if (req.method === 'GET' && req.url.startsWith('/src/')) {
      // Construct the redirected path
      const redirectPath = req.url.replace(/^\/src\//, '/client/src/');
      console.log(`🔄 Redirecting request from ${req.url} to ${redirectPath}`);
      
      // Change the URL path and pass to next middleware
      req.url = redirectPath;
    }
    
    next();
  };
}

/**
 * Creates a file system middleware that serves files from client/src when /src is requested
 */
export function createFileSystemRedirectMiddleware(root) {
  console.log('📁 Setting up file system redirection for /src paths...');
  const rootDir = root || process.cwd();
  
  return (req, res, next) => {
    if (req.method === 'GET' && req.url.startsWith('/src/')) {
      const requestedPath = req.url.slice(1); // Remove leading slash
      const redirectedPath = requestedPath.replace(/^src\//, 'client/src/');
      const fullPath = path.join(rootDir, redirectedPath);
      
      // Check if the file exists
      if (fs.existsSync(fullPath)) {
        console.log(`📄 Serving ${redirectedPath} instead of ${requestedPath}`);
        res.sendFile(fullPath);
        return;
      }
    }
    
    next();
  };
}

/**
 * A utility function to check file existence in both locations
 * Useful for debugging path resolution issues
 */
export function checkPathsExistence() {
  const root = process.cwd();
  const srcMainPath = path.join(root, 'src', 'main.tsx');
  const clientSrcMainPath = path.join(root, 'client', 'src', 'main.tsx');
  
  console.log('🔍 Checking critical paths existence:');
  console.log(`src/main.tsx: ${fs.existsSync(srcMainPath) ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`client/src/main.tsx: ${fs.existsSync(clientSrcMainPath) ? '✅ EXISTS' : '❌ MISSING'}`);
  
  return {
    srcExists: fs.existsSync(srcMainPath),
    clientSrcExists: fs.existsSync(clientSrcMainPath)
  };
}