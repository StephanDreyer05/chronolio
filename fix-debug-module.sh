#!/bin/bash

# Script to fix the missing debug module in send/node_modules
echo "Fixing missing debug module in send package..."

# Check if the send package exists
if [ -d "./node_modules/send" ]; then
  echo "Found send package"
  
  # Check if the debug module is missing
  if [ ! -d "./node_modules/send/node_modules/debug/src" ]; then
    echo "Debug module missing or incomplete in send package"
    
    # Create the directory structure if missing
    mkdir -p ./node_modules/send/node_modules/debug/src
    
    # Create a simple index.js file in the debug/src directory
    cat > ./node_modules/send/node_modules/debug/src/index.js << 'EOL'
/**
 * This is a simple replacement for the missing debug module
 * It provides a basic implementation that won't break the send package
 */

function createDebug(namespace) {
  function debug(...args) {
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${namespace}]`, ...args);
    }
    return debug;
  }
  
  debug.enabled = false;
  debug.color = '0';
  debug.namespace = namespace;
  
  // Add all the methods that might be used
  debug.extend = () => debug;
  debug.destroy = () => true;
  debug.log = console.log.bind(console);
  debug.formatArgs = () => {};
  debug.save = () => {};
  debug.load = () => {};
  debug.useColors = () => false;
  debug.storage = null;
  debug.colors = [];
  debug.inspectOpts = {};
  
  return debug;
}

createDebug.names = [];
createDebug.skips = [];
createDebug.formatters = {};
createDebug.selectColor = () => 0;
createDebug.enable = () => {};
createDebug.disable = () => '';
createDebug.enabled = () => false;
createDebug.humanize = (ms) => ms + 'ms';
createDebug.destroy = () => {};

// Export the createDebug function as both the default and named export
module.exports = createDebug;
module.exports.default = createDebug;
module.exports.createDebug = createDebug;
EOL
    
    # Create a package.json file if it doesn't exist
    if [ ! -f "./node_modules/send/node_modules/debug/package.json" ]; then
      echo "Creating package.json for debug module"
      cat > ./node_modules/send/node_modules/debug/package.json << 'EOL'
{
  "name": "debug",
  "version": "2.6.9",
  "description": "Small debugging utility",
  "main": "./src/index.js",
  "repository": "debug-js/debug",
  "license": "MIT"
}
EOL
    fi
    
    echo "✅ Fixed debug module in send package"
  else
    echo "Debug module exists, checking for index.js"
    if [ ! -f "./node_modules/send/node_modules/debug/src/index.js" ]; then
      echo "Creating index.js in existing debug/src directory"
      cat > ./node_modules/send/node_modules/debug/src/index.js << 'EOL'
/**
 * This is a simple replacement for the missing debug module
 * It provides a basic implementation that won't break the send package
 */

function createDebug(namespace) {
  function debug(...args) {
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${namespace}]`, ...args);
    }
    return debug;
  }
  
  debug.enabled = false;
  debug.color = '0';
  debug.namespace = namespace;
  
  // Add all the methods that might be used
  debug.extend = () => debug;
  debug.destroy = () => true;
  debug.log = console.log.bind(console);
  debug.formatArgs = () => {};
  debug.save = () => {};
  debug.load = () => {};
  debug.useColors = () => false;
  debug.storage = null;
  debug.colors = [];
  debug.inspectOpts = {};
  
  return debug;
}

createDebug.names = [];
createDebug.skips = [];
createDebug.formatters = {};
createDebug.selectColor = () => 0;
createDebug.enable = () => {};
createDebug.disable = () => '';
createDebug.enabled = () => false;
createDebug.humanize = (ms) => ms + 'ms';
createDebug.destroy = () => {};

// Export the createDebug function as both the default and named export
module.exports = createDebug;
module.exports.default = createDebug;
module.exports.createDebug = createDebug;
EOL
      echo "✅ Created index.js in existing debug/src directory"
    else
      echo "Debug module seems to be complete"
    fi
  fi
else
  echo "⚠️ Could not find send package in node_modules"
fi

echo "Debug module fix complete"