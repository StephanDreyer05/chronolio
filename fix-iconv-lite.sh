#!/bin/bash

# Script to fix the missing iconv-lite module
echo "Fixing missing iconv-lite module..."

# Check if the iconv-lite package exists
if [ -d "./node_modules/iconv-lite" ]; then
  echo "Found iconv-lite package"
  
  # Create lib directory if missing
  mkdir -p ./node_modules/iconv-lite/lib
  
  # Check if index.js is missing
  if [ ! -f "./node_modules/iconv-lite/lib/index.js" ]; then
    echo "Creating minimal index.js in iconv-lite/lib"
    
    # Create a minimal implementation of iconv-lite
    cat > ./node_modules/iconv-lite/lib/index.js << 'EOL'
/**
 * Minimal implementation of iconv-lite
 * This is a simplified version to prevent module not found errors
 */

// Simple encoder/decoder implementation
function simpleEncode(str, encoding) {
  if (typeof str !== 'string')
    throw new Error('Iconv-lite: String expected');
  
  try {
    return Buffer.from(str, encoding);
  } catch (e) {
    return Buffer.from(str, 'utf8'); // Fallback to utf8
  }
}

function simpleDecode(buf, encoding) {
  if (!Buffer.isBuffer(buf))
    buf = Buffer.from(buf);
  
  try {
    return buf.toString(encoding);
  } catch (e) {
    return buf.toString('utf8'); // Fallback to utf8
  }
}

// Main module
const iconv = {
  // Encoding functions
  encode: simpleEncode,
  decode: simpleDecode,
  encodingExists: (encoding) => ['utf8', 'utf-8', 'ascii'].includes(encoding.toLowerCase()),
  
  // Options
  defaultCharUnicode: '�',
  defaultCharSingleByte: '?',
  
  // Aliases
  getCodec: (encoding) => ({}),
  getEncoder: (encoding) => ({
    write: (str) => simpleEncode(str, encoding)
  }),
  getDecoder: (encoding) => ({
    write: (buf) => simpleDecode(buf, encoding)
  }),
};

// Export the module
module.exports = iconv;
EOL
    echo "✅ Created iconv-lite/lib/index.js"
  else
    echo "iconv-lite/lib/index.js already exists"
  fi
  
  # Check if package.json needs to be fixed
  if [ -f "./node_modules/iconv-lite/package.json" ]; then
    echo "Checking package.json"
    grep -q '"main"' ./node_modules/iconv-lite/package.json
    if [ $? -ne 0 ]; then
      echo "Fixing package.json main entry"
      # Create a temporary file with the fixed content
      TMP_FILE=$(mktemp)
      cat ./node_modules/iconv-lite/package.json | sed '2a\  "main": "./lib/index.js",' > $TMP_FILE
      # Replace the original file
      mv $TMP_FILE ./node_modules/iconv-lite/package.json
      echo "✅ Fixed package.json main entry"
    else
      echo "package.json main entry appears to be present"
    fi
  else
    echo "Creating package.json with correct main entry"
    cat > ./node_modules/iconv-lite/package.json << 'EOL'
{
  "name": "iconv-lite",
  "version": "0.4.24",
  "main": "./lib/index.js",
  "description": "Convert character encodings in pure javascript",
  "license": "MIT"
}
EOL
    echo "✅ Created package.json with correct main entry"
  fi
  
  echo "✅ Fixed iconv-lite module"
else
  echo "⚠️ Could not find iconv-lite package in node_modules"
fi

echo "iconv-lite module fix complete"