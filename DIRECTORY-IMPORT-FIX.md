# Fixing Directory Import Issues in Vercel Deployment

## Problem

When deploying to Vercel, you may encounter the error:

```
TypeError [ERR_INVALID_MODULE_SPECIFIER]: Invalid module "@db" is not a valid package name
```

This happens because:

1. TypeScript aliases like `@db` don't translate correctly in the compiled JavaScript
2. Directory imports without file extensions don't work in Vercel's Node.js environment

## Solution

We've implemented several fixes that automatically handle these issues during deployment:

### 1. Fix @db import paths

The `fix-db-imports.js` script automatically replaces:
- `from '@db'` → `from '../db'`
- `from '@db/schema'` → `from '../db/schema'`

This changes the import aliases to relative paths.

### 2. Add .js extensions to file imports

The `vercel-router-fix.js` script adds .js extensions to imports:
- `from './server/routes'` → `from './server/routes.js'`

This works because in Vercel's environment, you need to explicitly reference .js files when importing compiled TypeScript.

### 3. Automatic fixing during build

The `vercel-build.sh` script runs both fixers automatically during deployment, so you don't need to remember to run them manually.

## Manual Testing

If you want to test these fixes locally:

1. Run the scripts:
   ```
   node fix-db-imports.js
   node vercel-router-fix.js
   ```

2. Check your files to ensure the imports were properly updated:
   ```
   grep -r "@db" server/
   grep -r "from '\.\/server" vercel.js
   ```

## References

- [Node.js ESM documentation](https://nodejs.org/api/esm.html)
- [Vercel documentation on TypeScript](https://vercel.com/docs/functions/runtimes/node-js#typescript)