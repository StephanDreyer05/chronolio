# Chronolio Client

## Timeline Images with Amazon S3

The application uses Amazon S3 to store timeline images. To set this up:

1. Create an S3 bucket in your AWS console
2. Create an IAM user with the following permissions:
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:DeleteObject`
3. Set the following environment variables in your `.env` file:
   
   ```
   VITE_AWS_REGION=your-aws-region  # e.g., us-east-1
   VITE_AWS_ACCESS_KEY_ID=your-access-key-id
   VITE_AWS_SECRET_ACCESS_KEY=your-secret-access-key
   VITE_AWS_S3_BUCKET_NAME=your-bucket-name
   ```

4. Make sure the S3 bucket has proper CORS configuration to allow uploads from your domain:

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

5. For production, use environment variables in your deployment platform and never commit your AWS credentials to the repository.

## Adding images to timelines

Timeline images are now saved in S3 and display properly in the timeline. Each timeline can have up to 10 images.

The image upload flow works as follows:
1. Select your image files from the upload form
2. The client uploads the images directly to S3 (no server needed)
3. After successful upload, the S3 keys are saved in the database
4. When viewing images, signed URLs are generated for each image to allow secure access 