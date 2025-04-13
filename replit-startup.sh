#!/bin/bash

# Replit-specific startup script
echo "Starting Chronolio in Replit environment..."

# Remove src directory if it's a symlink or exists
if [ -e "src" ]; then
  echo "Removing existing src directory or symlink..."
  rm -rf src
fi

# Always recreate the symbolic link to ensure it's correct
echo "Creating symbolic link for src directory..."
ln -sf client/src src

# Start the application using the workflow
echo "Starting the application..."
npm run dev