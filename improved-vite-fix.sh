#!/bin/bash

# improved-vite-fix.sh: Enhanced direct Vite fix script with improved path alias support
# This script creates a direct server implementation with proper Replit host support
# Author: Replit AI Assistant
# Date: March 30, 2025

echo "=== Improved Vite Fix for Replit Development ==="
echo "This script will start a direct server with Replit host support"

# Step 1: Create symbolic link from client/src to src (if needed)
if [ ! -L "src" ]; then
  echo "Creating symbolic link from client/src to src..."
  rm -rf src
  ln -sf client/src src
  echo "Symbolic link created successfully"
else
  echo "Symbolic link already exists, skipping"
fi

# Step 2: Detect any existing processes on port 5000
echo "Checking for existing processes on port 5000..."
if lsof -i:5000 > /dev/null; then
  echo "Found process using port 5000, stopping it..."
  fuser -k 5000/tcp
  sleep 1
else
  echo "No existing process found on port 5000"
fi

# Step 3: Setup environment variables for Replit
echo "Setting up environment variables for Replit..."
export VITE_ALLOW_REPLIT_HOST=true
export NODE_ENV=development

# Get the Replit hostname
REPLIT_HOSTNAME=$(hostname -I | awk '{print $1}')
REPLIT_DOMAIN=$(echo $REPLIT_DOMAIN)
# Check if REPLIT_DOMAIN is not set, try to detect it
if [ -z "$REPLIT_DOMAIN" ]; then
  echo "REPLIT_DOMAIN not set, detecting alternatives..."
  # Try to get the hostname from the system
  if [ -f /etc/hostname ]; then
    REPLIT_DOMAIN=$(cat /etc/hostname)
    echo "Using hostname: $REPLIT_DOMAIN"
  fi
fi
echo "Using Replit host: $REPLIT_HOSTNAME"
echo "Using Replit domain: $REPLIT_DOMAIN"

# Step 4: Start the direct server with path alias support
echo "Starting direct server with proper path alias support..."
npx tsx server/direct-server.js

# This script should not exit unless the server crashes
echo "Server terminated"