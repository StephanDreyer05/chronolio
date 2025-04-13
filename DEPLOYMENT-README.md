# Chronolio Deployment Resources

Welcome to the Chronolio deployment documentation! This file provides an overview of all the deployment resources and documentation available to help you deploy Chronolio successfully.

## Getting Started

For a complete overview of deployment options and requirements, start with:

- [COMPREHENSIVE-DEPLOYMENT-GUIDE.md](./COMPREHENSIVE-DEPLOYMENT-GUIDE.md) - Complete deployment guide for both Replit and Vercel

## Platform-Specific Guides

### Vercel Deployment

- [VERCEL-DEPLOYMENT-GUIDE.md](./VERCEL-DEPLOYMENT-GUIDE.md) - Detailed instructions for deploying to Vercel
- [DATABASE-CONNECTION-GUIDE.md](./DATABASE-CONNECTION-GUIDE.md) - Solving database connection issues in Vercel
- [DIRECTORY-IMPORT-FIX.md](./DIRECTORY-IMPORT-FIX.md) - Fixing module import errors in Vercel

### Replit Deployment

- [REPLIT-DEPLOYMENT-SCRIPTS.md](./REPLIT-DEPLOYMENT-SCRIPTS.md) - Guide to Replit deployment scripts
- [WORKFLOW-UPDATE-MANUAL.md](./WORKFLOW-UPDATE-MANUAL.md) - How to update Replit workflows

## Utility Scripts

### Vercel Utilities

| Script | Purpose |
|--------|---------|
| `validate-vercel-setup.sh` | Validates that your project is ready for Vercel deployment |
| `vercel-build.sh` | Custom build script for Vercel deployment |
| `test-vercel-database.js` | Tests database connection with Vercel-compatible settings |
| `verify-db-schema.js` | Verifies database schema is properly set up |
| `ensure-vercel-schema.js` | Creates missing database tables required for Vercel |
| `transfer-database.js` | Transfers data between PostgreSQL databases |
| `vercel-router-fix.js` | Fixes directory import issues in Vercel deployment |
| `fix-vercel-database.js` | Fixes schema compatibility issues for Vercel |

### Replit Utilities

| Script | Purpose |
|--------|---------|
| `deploy-on-replit.js` | Streamlines Replit deployment process |
| `modify-workflow.js` | Updates Replit workflow configuration |
| `update-workflow-script.js` | Alternative workflow updater with Replit fixes |
| `patch-vite-config.js` | Patches Vite configuration for Replit |
| `create-vite-server-config.js` | Creates server configuration for Vite on Replit |
| `dev-with-replit-fixes.sh` | Development script with Replit-specific fixes |

## Diagnostic Tools

### Health Check Endpoints

The application includes several diagnostic API endpoints:

- `/api/health` - General health status with database connectivity check
- `/api/health/database` - Detailed database diagnostic information
- `/api/health/detailed` - Complete system diagnostic (development only)

### Database Tools

- `check-db-tables.js` - Checks if all required database tables exist
- `debug-shares.js` - Debugging utility for share functionality
- `db-check.js` - Basic database connectivity check

## Environment Variables

Required environment variables:

| Name | Description | Required? |
|------|-------------|-----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| SESSION_SECRET | Secret for session encryption | Yes |
| LEMONSQUEEZY_API_KEY | API key for payment processing | Only if using payments |
| OPENAI_API_KEY | API key for AI features | Only if using AI features |

## Common Issues

For the most common deployment issues and solutions, refer to:

- [COMPREHENSIVE-DEPLOYMENT-GUIDE.md#common-issues](./COMPREHENSIVE-DEPLOYMENT-GUIDE.md#common-issues)
- [DATABASE-CONNECTION-GUIDE.md](./DATABASE-CONNECTION-GUIDE.md) for database-specific issues
- [DIRECTORY-IMPORT-FIX.md](./DIRECTORY-IMPORT-FIX.md) for module import problems

## Support

If you encounter issues not covered in these guides, try:

1. Running the appropriate diagnostic tools
2. Checking logs in your deployment platform
3. Reviewing platform-specific documentation (Vercel or Replit docs)

The diagnostic health endpoints (like `/api/health/database`) can provide valuable information about what might be going wrong.