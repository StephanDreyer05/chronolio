# Setting Up AWS S3 Integration for Chronolio

This guide explains how to properly set up S3 integration for timeline images in Chronolio.

## Important Notes About AWS Integration

The timeline image system is designed to work in two modes:
1. **Server-side storage mode** - Images are stored on the server (default)
2. **AWS S3 mode** - Images are stored in an S3 bucket (requires setup)

The code is built to automatically fall back to server-side storage if AWS S3 configuration is missing or invalid.

## Build Environment Configuration

To ensure a smooth build process, we've implemented several techniques to prevent build errors:

1. **Vite Configuration**: We've set up Rollup to externalize AWS SDK dependencies:
   ```javascript
   // In vite.config.ts
   rollupOptions: {
     external: [
       '@aws-sdk/client-s3',
       '@aws-sdk/s3-request-presigner',
       /^@aws-sdk\/.*/,
       /^@smithy\/.*/
     ]
   }
   ```

2. **Dynamic Imports**: The S3 service uses dynamic imports with Vite hints to prevent static analysis:
   ```javascript
   // Using @vite-ignore to prevent static analysis
   const s3Module = await import(/* @vite-ignore */ '@aws-sdk/client-s3').catch(() => null);
   ```

3. **Environment Detection**: Code detects if it's running in Node.js vs browser environment:
   ```javascript
   // Skip AWS SDK import during build time
   if (typeof window === 'undefined') {
     return false; // Don't attempt import during build
   }
   ```

## Local Development with S3

1. **Install AWS SDK Dependencies locally**:
   ```bash
   # Run this from the project root directory
   node update-package-deps.js
   npm install
   ```

2. **Update environment variables**:
   Edit the `client/.env` file and add your AWS credentials:
   ```
   VITE_AWS_REGION=us-east-1  # Replace with your region
   VITE_AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
   VITE_AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
   VITE_AWS_S3_BUCKET_NAME=YOUR_BUCKET_NAME
   ```

3. **Set up your S3 bucket**:
   - Create an S3 bucket in your AWS account
   - Configure CORS settings to allow uploads from your domain:
     ```json
     [
       {
         "AllowedHeaders": ["*"],
         "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
         "AllowedOrigins": ["http://localhost:5173", "https://yourdomain.com"],
         "ExposeHeaders": []
       }
     ]
     ```

## Deploying to Vercel

For Vercel deployments, we recommend the following approach:

1. **Do NOT modify package.json**: 
   - Leave AWS SDK dependencies OUT of package.json for production
   - This prevents build issues with npm ci

2. **Set environment variables in Vercel**:
   In your Vercel project settings, add the following environment variables:
   ```
   VITE_AWS_REGION=us-east-1  # Replace with your region
   VITE_AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
   VITE_AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
   VITE_AWS_S3_BUCKET_NAME=YOUR_BUCKET_NAME
   ```

3. **Deploy your application**:
   - The system will use dynamic imports to load AWS SDK at runtime
   - AWS SDK will not be part of the build process
   - If AWS SDK successfully loads at runtime and credentials are valid, S3 will be used
   - If AWS SDK fails to load or credentials are invalid, the system will fall back to server-side storage

## Troubleshooting Build Errors

If you encounter build errors related to AWS SDK:

1. **Vite/Rollup Warnings**: If you see warnings about unresolved imports:
   - Check that vite.config.ts has the correct external configuration
   - Ensure s3Service.ts is using the `/* @vite-ignore */` comment in dynamic imports

2. **Package.json Issues**: If npm ci fails with missing dependencies:
   - Verify AWS SDK packages are NOT in package.json for production builds
   - Use the update-package-deps.js script only for local development

3. **Runtime Errors**: If S3 uploads fail at runtime:
   - Check browser console for error messages from the fallback system
   - Verify your AWS credentials are correctly set in Vercel environment variables

## How the Fallback System Works

The S3 integration is designed with a graceful fallback mechanism:

1. **During build**: AWS SDK is not included in the build, avoiding dependency issues
2. **During runtime**: The code attempts to dynamically import AWS SDK
3. **S3 Key Handling**: 
   - If AWS SDK loads successfully, images are uploaded to S3 and the key is stored
   - If AWS SDK fails to load, a fallback "mock key" is generated
4. **Image Loading**: The system detects fallback keys and renders placeholder images

This approach ensures your application will always work, with or without AWS S3 configuration. 