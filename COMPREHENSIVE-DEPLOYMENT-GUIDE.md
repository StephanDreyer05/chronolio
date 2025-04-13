# Comprehensive Deployment Guide for Chronolio

This guide explains how to successfully deploy Chronolio to different platforms, addressing common issues and providing solutions.

## Table of Contents
1. [Common Issues and Solutions](#common-issues-and-solutions)
2. [Vercel Deployment](#vercel-deployment)
3. [Replit Deployment](#replit-deployment)
4. [Database Setup](#database-setup)
5. [Environment Variables](#environment-variables)

## Common Issues and Solutions

### TypeScript Errors

1. **Missing type definitions for packages:**
   - We've added a custom type definition for `connect-pg-simple` in `server/types/connect-pg-simple.d.ts`
   - If you encounter "Could not find a declaration file for module X", add a type definition in the `server/types` directory.

2. **String | null incompatibility:**
   - We've added null checks before passing potentially null values to functions that expect strings.
   - For example, in `sendPasswordResetEmail` we've added a check for `user.email` being null before calling the function.

### Module Import Errors

1. **@db import path resolution:**
   - The script `fix-db-imports.js` fixes @db import paths by replacing them with relative paths.
   - In vercel-build.sh, this script is automatically run to update imports for Vercel compatibility.

2. **Directory imports:**
   - Directory imports like `import x from './server/routes'` don't work in Vercel's environment.
   - We've updated vercel.js to use `.js` extensions on imports.
   - The `vercel-router-fix.js` script automates this process.

### Missing Module Files

1. **Module Not Found error for @jridgewell packages:**
   - We've fixed missing MJS files by copying the UMD files.
   - For example: `cp resolve-uri.umd.js resolve-uri.mjs`

2. **Schema mismatch with database:**
   - Added missing `last_modified` fields to TypeScript schema definitions.
   - Ensured field names match between TypeScript and the database.

## Vercel Deployment

To deploy to Vercel:

1. Make sure your `vercel.json` file is set up correctly:
   ```json
   {
     "version": 2,
     "framework": null,
     "buildCommand": "chmod +x ./vercel-build.sh && ./vercel-build.sh",
     "installCommand": "npm ci",
     "outputDirectory": "public",
     "devCommand": "npm run dev",
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           { "key": "Cache-Control", "value": "s-maxage=0" }
         ]
       }
     ],
     "rewrites": [
       { "source": "/api/(.*)", "destination": "/api" },
       { "source": "/(.*)", "destination": "/" }
     ]
   }
   ```

2. Set up your environment variables in Vercel dashboard:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `SESSION_SECRET`: Secret for session encryption
   - `LEMONSQUEEZY_API_KEY`: Your LemonSqueezy API key (if using payments)
   - `LEMONSQUEEZY_STORE_ID`: Your LemonSqueezy store ID (if using payments)
   - `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`: If using email functionality

3. Deploy to Vercel:
   ```
   vercel
   ```

## Replit Deployment

To deploy to Replit:

1. Use the `Start application` workflow that runs `bash ./dev-with-replit-fixes.sh`

2. The `dev-with-replit-fixes.sh` script handles:
   - Creating physical `src` directory replacing symlinks
   - Patching Vite configuration for Replit compatibility
   - Starting the development server with the correct settings

3. Set up your environment variables in Replit Secrets tab:
   - Same variables as listed for Vercel

## Database Setup

1. Your database should have all required tables defined in `db/schema.ts`

2. Make sure your `DATABASE_URL` points to a valid PostgreSQL database:
   ```
   postgres://username:password@hostname:5432/database_name
   ```

3. Run migrations if schema has changed:
   ```bash
   node run-migrations.js
   ```

4. If you need to create tables for vendors, run:
   ```bash
   node run-vendor-migrations.js
   ```

## Environment Variables

Here's a list of all environment variables needed for a complete deployment:

| Variable | Description | Required? |
|----------|-------------|-----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Secret for session encryption | Yes |
| `LEMONSQUEEZY_API_KEY` | LemonSqueezy API key | For payments |
| `LEMONSQUEEZY_STORE_ID` | LemonSqueezy store ID | For payments |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Webhook verification | For webhooks |
| `OPENAI_API_KEY` | OpenAI API key | For AI features |
| `EMAIL_HOST` | SMTP host | For email |
| `EMAIL_PORT` | SMTP port | For email |
| `EMAIL_USER` | SMTP username | For email |
| `EMAIL_PASS` | SMTP password | For email |
| `EMAIL_SECURE` | Use TLS (true/false) | For email |
| `EMAIL_FROM` | From address | For email |
| `BASE_URL` | Application URL | For email links |
