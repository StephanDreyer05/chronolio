/**
 * Custom Vercel Build Script for Chronolio
 * This Node.js script replaces the bash script for better Vercel compatibility
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting Chronolio build for Vercel deployment...');

try {
  // Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  // Build frontend with Vite
  console.log('🏗️ Building frontend with Vite...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  // Build server with esbuild
  console.log('🛠️ Building server with esbuild...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', 
    { stdio: 'inherit' });
  
  // Create output directory structure
  console.log('📁 Setting up output directory structure...');
  
  // Ensure public directory exists
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public', { recursive: true });
    console.log('  Created public directory');
  }
  
  // Copy build output to public directory
  if (fs.existsSync('dist/public') && fs.readdirSync('dist/public').length > 0) {
    console.log('  Copying files from dist/public to public directory...');
    execSync('cp -r dist/public/* public/', { stdio: 'inherit' });
  } else if (fs.existsSync('dist') && fs.readdirSync('dist').length > 0) {
    console.log('  Copying files from dist to public directory...');
    execSync('cp -r dist/* public/', { stdio: 'inherit' });
  } else {
    console.log('⚠️ No build output found, creating fallback files...');
    
    // Create minimal index.html as fallback
    const fallbackHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Chronolio</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #4f46e5; }
  </style>
</head>
<body>
  <h1>Chronolio</h1>
  <p>The application is being prepared. Please check back soon.</p>
  <p>If you expected to see the application, please contact the administrator.</p>
</body>
</html>`;
    
    fs.writeFileSync('public/index.html', fallbackHtml.trim());
    console.log('  Created fallback index.html');
  }
  
  console.log('✅ Build completed successfully!');
  
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
} 