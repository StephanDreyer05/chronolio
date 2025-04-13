#!/bin/bash

# Extract the Replit host from the environment
REPLIT_HOST=$(hostname)
if [ -z "$REPLIT_HOST" ]; then
  echo "Could not determine Replit host"
  exit 1
fi

echo "Setting up for Replit host: $REPLIT_HOST"

# Set environment variables for Vite
export VITE_ALLOW_ORIGIN=true
export VITE_DEV_SERVER_HOST="0.0.0.0"
export VITE_DEV_SERVER_PORT=5000
export VITE_FORCE_WEBSOCKET_URL=true

# Create the symlink for src (if it doesn't exist)
if [ ! -L "src" ]; then
  echo "Creating symlink from client/src to src"
  rm -rf src
  ln -sf client/src src
fi

# Start the development server
echo "Starting development server with Replit host configuration..."
tsx server/index.ts