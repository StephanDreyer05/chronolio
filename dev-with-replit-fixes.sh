#!/bin/bash

echo "Starting development with Replit environment fixes"

# Create physical src directory from client/src
echo "Creating physical src directory (replacing symlink approach)"
rm -rf src
mkdir -p src
cp -R client/src/* src/

# Verify copy succeeded
if [ ! -f "src/main.tsx" ]; then
  echo "❌ Error: Failed to copy main.tsx to src directory!"
  ls -la client/src/
  exit 1
else
  echo "✅ Successfully created src/main.tsx"
fi

# Fix module issues with @jridgewell packages
if [ -f "./fix-jridgewell-modules.sh" ]; then
  echo "Fixing @jridgewell module issues..."
  chmod +x ./fix-jridgewell-modules.sh
  ./fix-jridgewell-modules.sh
else
  echo "⚠️ fix-jridgewell-modules.sh not found, skipping module fixes"
  
  # Manual fix for @jridgewell/resolve-uri and trace-mapping
  RESOLVE_URI_DIST="./node_modules/@jridgewell/resolve-uri/dist"
  TRACE_MAPPING_DIST="./node_modules/@jridgewell/trace-mapping/dist"
  
  if [ -d "$RESOLVE_URI_DIST" ] && [ -f "$RESOLVE_URI_DIST/resolve-uri.umd.js" ]; then
    echo "Manual fix: Creating resolve-uri.mjs wrapper..."
    cat > "$RESOLVE_URI_DIST/resolve-uri.mjs" << 'EOL'
import * as resolveUriModule from './resolve-uri.umd.js';
export default resolveUriModule.default || resolveUriModule;
EOL
    echo "✅ Created resolve-uri.mjs wrapper"
  fi
  
  if [ -d "$TRACE_MAPPING_DIST" ] && [ -f "$TRACE_MAPPING_DIST/trace-mapping.mjs" ]; then
    echo "Manual fix: Patching trace-mapping.mjs imports..."
    sed -i "s/import resolveUri from '@jridgewell\/resolve-uri';/import * as resolveUriModule from '@jridgewell\/resolve-uri';\nconst resolveUri = resolveUriModule.default || resolveUriModule;/g" "$TRACE_MAPPING_DIST/trace-mapping.mjs"
    echo "✅ Patched trace-mapping.mjs imports"
  fi
fi

# Fix missing debug module in the send package
if [ -f "./fix-debug-module.sh" ]; then
  echo "Fixing debug module issues..."
  chmod +x ./fix-debug-module.sh
  ./fix-debug-module.sh
else
  echo "⚠️ fix-debug-module.sh not found, implementing manual fix"
  
  # Manual fix for debug module in send package
  if [ -d "./node_modules/send" ]; then
    echo "Creating missing debug module in send package..."
    mkdir -p ./node_modules/send/node_modules/debug/src
    
    # Create a simple index.js file
    cat > ./node_modules/send/node_modules/debug/src/index.js << 'EOL'
/**
 * Simple replacement for debug module
 */
function createDebug(namespace) {
  function debug(...args) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${namespace}]`, ...args);
    }
    return debug;
  }
  debug.enabled = false;
  debug.color = '0';
  debug.namespace = namespace;
  debug.extend = () => debug;
  debug.destroy = () => true;
  debug.log = console.log.bind(console);
  return debug;
}
module.exports = createDebug;
module.exports.default = createDebug;
EOL
    
    # Create a package.json file
    cat > ./node_modules/send/node_modules/debug/package.json << 'EOL'
{
  "name": "debug",
  "version": "2.6.9",
  "main": "./src/index.js"
}
EOL
    echo "✅ Fixed debug module in send package"
  else
    echo "⚠️ Could not find send package"
  fi
fi

# Fix missing iconv-lite module
if [ -f "./fix-iconv-lite.sh" ]; then
  echo "Fixing iconv-lite module issues..."
  chmod +x ./fix-iconv-lite.sh
  ./fix-iconv-lite.sh
else
  echo "⚠️ fix-iconv-lite.sh not found, implementing manual fix"
  
  # Manual fix for iconv-lite
  if [ -d "./node_modules/iconv-lite" ]; then
    echo "Creating minimal iconv-lite implementation..."
    mkdir -p ./node_modules/iconv-lite/lib
    
    # Create a simple index.js file
    cat > ./node_modules/iconv-lite/lib/index.js << 'EOL'
/**
 * Minimal implementation of iconv-lite
 */
function simpleEncode(str, encoding) {
  return Buffer.from(str, 'utf8');
}

function simpleDecode(buf, encoding) {
  return Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf);
}

const iconv = {
  encode: simpleEncode,
  decode: simpleDecode,
  encodingExists: () => true
};

module.exports = iconv;
EOL
    
    # Create or update package.json
    cat > ./node_modules/iconv-lite/package.json << 'EOL'
{
  "name": "iconv-lite",
  "version": "0.4.24",
  "main": "./lib/index.js"
}
EOL
    echo "✅ Fixed iconv-lite module"
  else
    echo "⚠️ Could not find iconv-lite package"
  fi
fi

# Set environment variables for Replit
export REPLIT_ENVIRONMENT=true
export REPL_ID=$(hostname)
export VITE_DEV_SERVER_HOST="0.0.0.0"
export VITE_DEV_SERVER_PORT=5000

# Apply Vite patch with Node ESM mode
echo "Applying Vite patch for Replit compatibility"
node --experimental-specifier-resolution=node --experimental-modules patch-vite-config.js

# Start the development server
echo "Starting development server with Replit configuration..."
npm run dev