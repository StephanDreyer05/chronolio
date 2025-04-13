#!/bin/bash

# Script to fix @jridgewell module import issues
# This fixes the SyntaxError where modules don't provide a 'default' export

echo "Fixing @jridgewell module imports..."

# Find the @jridgewell/resolve-uri module
RESOLVE_URI_DIR=$(find ./node_modules/@jridgewell/resolve-uri -type d -name "dist" 2>/dev/null)

if [ -n "$RESOLVE_URI_DIR" ]; then
  echo "Found resolve-uri at: $RESOLVE_URI_DIR"
  
  # Check if the umd file exists
  if [ -f "$RESOLVE_URI_DIR/resolve-uri.umd.js" ]; then
    echo "Creating resolve-uri.mjs from UMD file..."
    # Create a wrapper that exports the UMD module as default
    cat > "$RESOLVE_URI_DIR/resolve-uri.mjs" << 'EOL'
import * as resolveUriModule from './resolve-uri.umd.js';
export default resolveUriModule.default || resolveUriModule;
EOL
    echo "✅ Fixed resolve-uri module"
  else
    echo "⚠️ UMD file not found in $RESOLVE_URI_DIR"
  fi
else
  echo "⚠️ Could not find @jridgewell/resolve-uri module"
fi

# Find the @jridgewell/trace-mapping module
TRACE_MAPPING_DIR=$(find ./node_modules/@jridgewell/trace-mapping -type d -name "dist" 2>/dev/null)

if [ -n "$TRACE_MAPPING_DIR" ]; then
  echo "Found trace-mapping at: $TRACE_MAPPING_DIR"
  
  # Update the import in trace-mapping.mjs
  if [ -f "$TRACE_MAPPING_DIR/trace-mapping.mjs" ]; then
    echo "Patching trace-mapping.mjs imports..."
    sed -i "s/import resolveUri from '@jridgewell\/resolve-uri';/import * as resolveUriModule from '@jridgewell\/resolve-uri';\nconst resolveUri = resolveUriModule.default || resolveUriModule;/g" "$TRACE_MAPPING_DIR/trace-mapping.mjs"
    echo "✅ Fixed trace-mapping module imports"
  else
    echo "⚠️ trace-mapping.mjs not found in $TRACE_MAPPING_DIR"
  fi
else
  echo "⚠️ Could not find @jridgewell/trace-mapping module"
fi

echo "Module fixes complete!"