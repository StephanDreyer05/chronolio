# Vercel Deployment Guide for Chronolio

This guide explains how to deploy the Chronolio application on Vercel's platform, ensuring a smooth deployment experience.

## Prerequisites

- GitHub repository with your Chronolio codebase
- Vercel account (free or paid)
- PostgreSQL database (hosted on a service like Supabase, Railway, etc.)

## 1. Prepare Your Repository

Ensure your repository has all the required Vercel deployment files:

- `vercel.json` - Vercel configuration file
- `vercel.js` - Serverless function entry point 
- `api/index.js` - API routes for serverless functions
- `vercel-build.sh` - Custom build script for the Vercel platform

You can verify your setup by running:

```sh
./validate-vercel-setup.sh
```

## 2. Configure Package.json

Ensure your `package.json` file includes the following build script:

```json
"scripts": {
  "build": "./vercel-build.sh",
  // other scripts...
}
```

This ensures Vercel uses our custom build script during deployment.

## 3. Connect to Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" > "Project"
3. Select your GitHub repository
4. Configure the project with the following settings:
   - **Framework Preset**: Other
   - **Build Command**: Leave as default (it uses the one from package.json)
   - **Output Directory**: `public` (should already be set in `vercel.json`)
   - **Install Command**: `npm install` (default)

## 4. Configure Environment Variables

Add the following environment variables in the Vercel project settings:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `SESSION_SECRET` | Random string for session encryption |
| `LEMONSQUEEZY_API_KEY` | API key for payment processing (if using) |
| `OPENAI_API_KEY` | API key for AI features (if using) |

> **Important**: These values must match the ones used in your local development environment to ensure consistency.

## 5. Deploy Your Project

1. Click "Deploy" to start the deployment process
2. Vercel will build and deploy your application
3. Once completed, you'll receive a deployment URL (e.g., `https://your-project.vercel.app`)

## Verifying Your Deployment

After deployment, check the following:

1. Visit your deployment URL to ensure the frontend loads correctly
2. Test API endpoints by navigating to `/api/health` or other API routes
3. Verify database connectivity by performing operations that require database access

## Troubleshooting Common Issues

### Empty Output Directory Error

If you see an error about the public directory being empty, ensure:

1. The build script (`vercel-build.sh`) is executable (`chmod +x vercel-build.sh`)
2. Run `./test-deploy.sh` locally to verify the build process works
3. Check Vercel build logs for any specific error messages

### TypeScript Build Errors

If you encounter TypeScript errors during build:

1. Check the build logs for specific error messages
2. Common issues include:
   - Missing fields in the schema (e.g., `last_modified` field)
   - Import path issues due to path aliases
   - Directory import errors (especially with ES modules)
   - Incompatible TypeScript versions

3. Our build script includes automatic fixes for known TypeScript issues:
   - It adds required fields to the schema
   - Adapts import paths for Vercel's environment
   - Fixes directory imports by replacing them with file imports with .js extensions

4. If you encounter directory import errors (`ERR_UNSUPPORTED_DIR_IMPORT`):
   - Run our router fix script to automatically fix import paths:
     ```bash
     node vercel-router-fix.js
     ```
   - This will add proper .js extensions to all imports in vercel.js
   - For detailed information, see [DIRECTORY-IMPORT-FIX.md](./DIRECTORY-IMPORT-FIX.md)

5. If you still encounter TypeScript errors:
   - Review the error messages carefully
   - Run the schema compatibility fix script:
     ```bash
     node fix-vercel-database.js
     ```
   - If using new fields in your schema, ensure they're properly added to both development and production environments

### API Routes Not Working

If API routes return 404 errors:

1. Verify `api/index.js` exists in your repository
2. Check `vercel.json` has the correct routes configuration
3. Look for errors in the Vercel function logs

### Database Connection Issues

If the application fails to connect to the database:

1. Verify the `DATABASE_URL` environment variable is set correctly
   - The format should be: `postgresql://username:password@host:port/database?sslmode=require`
   - For most hosted PostgreSQL services, SSL is required (include `?sslmode=require`)
   - Double-check credentials, especially if you've recently updated them
   - For detailed troubleshooting, see [DATABASE-CONNECTION-GUIDE.md](./DATABASE-CONNECTION-GUIDE.md)

2. Use our advanced diagnostic tools to identify and fix issues:

   - **Test database connectivity** with enhanced diagnostics:
     ```bash
     node test-vercel-database.js
     ```
     This tool simulates the Vercel environment locally and tests your database connection with detailed error reporting

   - **Verify database schema** to ensure all tables exist:
     ```bash
     node verify-db-schema.js
     ```
     This checks for all required tables and reports any missing structures

   - **Create missing database tables** automatically:
     ```bash
     node ensure-vercel-schema.js
     ```
     This creates any missing tables and adds required fields for Vercel compatibility

   - **Transfer data between databases** if switching providers:
     ```bash
     # First set environment variables:
     # SOURCE_DATABASE_URL=your_current_database_url
     # TARGET_DATABASE_URL=your_new_database_url
     node transfer-database.js
     ```
     This helps migrate all your data when changing database providers

   - Visit the `/api/health` endpoint to check database status in production
   - Check Vercel Function logs for specific database error messages

3. Fix common connectivity issues:
   - **SSL Issues**: Try modifying the connection string:
     - Add `?sslmode=require` or try without it
     - Some providers need `?ssl=true` instead
   - **Firewall Issues**: Ensure your database accepts connections from Vercel's IP ranges
   - **Connection Limits**: Some database plans have connection limits - use our optimized pooling
   - **Credentials**: Ensure username/password are URL-encoded if they contain special characters

4. Database hosting recommendations:
   - Vercel works best with these PostgreSQL providers:
     - [Supabase](https://supabase.com/) (Recommended, generous free tier)
     - [Neon](https://neon.tech/) (Serverless-friendly)
     - [Railway](https://railway.app/) (Developer-friendly)
     - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (Tight integration)

5. Run the enhanced schema and connection compatibility fix:
   ```bash
   node fix-vercel-database.js
   ```
   This adds the necessary schema fields and connection handling optimized for Vercel

6. Debug with detailed database diagnostics:
   ```bash
   # If you're seeing specific error codes, check:
   
   # ENOTFOUND: Hostname can't be resolved - check DATABASE_URL host
   # ECONNREFUSED: Server refusing connections - check firewall rules
   # 28P01: Authentication failed - check username/password
   # 3D000: Database doesn't exist - check database name
   # 42P01: Relation doesn't exist - run schema verification script
   ```

## Continuous Deployment

Vercel automatically deploys when you push changes to your repository. For a production website, consider:

1. Setting up preview deployments for pull requests
2. Configuring production branch protection rules
3. Setting up deployment protection with password or authentication

## Database Migration

If you need to switch database providers or migrate your data to a new database:

1. **Prepare your new database**:
   - Create a new PostgreSQL database with your chosen provider
   - Obtain the new DATABASE_URL connection string
   - Ensure the database allows connections from your local machine

2. **Use our database transfer tool**:
   ```bash
   # Set environment variables in your terminal
   export SOURCE_DATABASE_URL=postgresql://username:password@current-host:port/database
   export TARGET_DATABASE_URL=postgresql://username:password@new-host:port/database
   
   # Run the transfer utility
   node transfer-database.js
   ```

3. **Verify the migration**:
   ```bash
   # Update your local DATABASE_URL to the new one
   export DATABASE_URL=postgresql://username:password@new-host:port/database
   
   # Verify the schema and data
   node verify-db-schema.js
   ```

4. **Update Vercel environment variables**:
   - Go to your Vercel project settings
   - Update the DATABASE_URL to point to the new database
   - Redeploy your application

This process allows you to seamlessly migrate between database providers while preserving all your application data.

## Need More Help?

If you encounter issues not covered in this guide, you can:

1. Review the [Vercel Documentation](https://vercel.com/docs)
2. Check the Chronolio project's specific deployment scripts
3. Run the validation script for a quick diagnostic: `./validate-vercel-setup.sh`