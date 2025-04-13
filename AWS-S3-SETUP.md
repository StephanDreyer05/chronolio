# Setting Up AWS S3 Integration for Chronolio

This guide explains how to properly set up S3 integration for timeline images in Chronolio.

## Issues with Vercel Deployment

If you're experiencing build errors related to AWS SDK dependencies when deploying to Vercel, it's likely because the package.json and package-lock.json files are out of sync. Here's how to fix it:

## Local Development Setup

1. **Install AWS SDK Dependencies**:
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

When deploying to Vercel, follow these steps:

1. **Make sure package-lock.json is up-to-date**:
   Run `npm install` locally to update package-lock.json with AWS SDK dependencies

2. **Commit package-lock.json changes**:
   ```bash
   git add package-lock.json
   git commit -m "Update package-lock.json with AWS SDK dependencies"
   git push
   ```

3. **Set environment variables in Vercel**:
   In your Vercel project settings, add the following environment variables:
   ```
   VITE_AWS_REGION=us-east-1  # Replace with your region
   VITE_AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
   VITE_AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
   VITE_AWS_S3_BUCKET_NAME=YOUR_BUCKET_NAME
   ```

## Fallback Behavior

The S3 integration is designed with fallback mechanisms:

1. During build time: The AWS SDK dynamic imports are skipped
2. During runtime: If AWS credentials are missing or incorrect, the app falls back to server-side storage
3. When uploading: If S3 upload fails, the app falls back to direct API uploads

This ensures your application will work even if S3 integration is not fully set up. 