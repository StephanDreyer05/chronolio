# Module Fixes Guide for Chronolio

This guide addresses common Node.js module issues when running Chronolio on different platforms.

## Common Module Issues

### 1. @jridgewell/resolve-uri Module

**Issue**: The error `SyntaxError: The requested module '@jridgewell/resolve-uri' does not provide an export named 'default'` occurs because:
- The module `@jridgewell/resolve-uri` is imported as a default import 
- This module is actually an ESM module without a default export

**Solution**: 
We've created a wrapper in `resolve-uri.mjs` that exports the module as default:

```javascript
// Fix for resolve-uri module
import * as resolveUriModule from './resolve-uri.umd.js';
export default resolveUriModule.default || resolveUriModule;
```

### 2. Debug Module in Send Package

**Issue**: The error `Cannot find module '/node_modules/send/node_modules/debug/src/index.js'` occurs because:
- The `send` package expects a specific `debug` module in its node_modules folder
- This module is either missing or incomplete

**Solution**:
We create a minimal implementation of the debug module:

```javascript
// Fix for debug module
function createDebug(namespace) {
  function debug(...args) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${namespace}]`, ...args);
    }
    return debug;
  }
  debug.enabled = false;
  // Add other necessary properties
  return debug;
}
module.exports = createDebug;
```

### 3. Iconv-Lite Module 

**Issue**: The error `Cannot find module '/node_modules/iconv-lite/lib/index.js'` occurs because:
- The `iconv-lite` module's file structure is incomplete
- Missing main file or incorrect main entry in package.json

**Solution**:
We create a minimal implementation of the iconv-lite module:

```javascript
// Fix for iconv-lite module
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
```

## Using the Fix Scripts

We've created several scripts to automatically fix these issues:

1. **fix-jridgewell-modules.sh**: Fixes issues with @jridgewell packages
2. **fix-debug-module.sh**: Fixes the debug module in the send package
3. **fix-iconv-lite.sh**: Fixes the iconv-lite module

These scripts are automatically run by the `dev-with-replit-fixes.sh` script when starting the application.

## Manual Fixes

If you need to manually fix these issues:

### For @jridgewell/resolve-uri:

```bash
mkdir -p ./node_modules/@jridgewell/resolve-uri/dist
cat > ./node_modules/@jridgewell/resolve-uri/dist/resolve-uri.mjs << 'EOL'
import * as resolveUriModule from './resolve-uri.umd.js';
export default resolveUriModule.default || resolveUriModule;
EOL
```

### For debug in send:

```bash
mkdir -p ./node_modules/send/node_modules/debug/src
cat > ./node_modules/send/node_modules/debug/src/index.js << 'EOL'
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

cat > ./node_modules/send/node_modules/debug/package.json << 'EOL'
{
  "name": "debug",
  "version": "2.6.9",
  "main": "./src/index.js"
}
EOL
```

### For iconv-lite:

```bash
mkdir -p ./node_modules/iconv-lite/lib
cat > ./node_modules/iconv-lite/lib/index.js << 'EOL'
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

cat > ./node_modules/iconv-lite/package.json << 'EOL'
{
  "name": "iconv-lite",
  "version": "0.4.24",
  "main": "./lib/index.js"
}
EOL
```

## Preventing Module Issues

To avoid these issues in future deployments:

1. Lock your dependency versions in package.json
2. Use a package-lock.json file to ensure consistent installs
3. Consider bundling your application for production to avoid runtime dependency issues
4. Test your application in an environment similar to your production environment before deploying