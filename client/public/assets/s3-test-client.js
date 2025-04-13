/**
 * S3 Test Client
 * 
 * This script provides a client-side testing function for AWS S3
 * that uses the server-side API instead of direct AWS SDK imports
 */

// Define the test function in the global scope
window.testS3Connection = async function(resultElement) {
  if (!resultElement) {
    console.error('Result element is required');
    return;
  }
  
  resultElement.innerHTML = '<span>Testing S3 connection via server API...</span>';
  
  try {
    // First check if we have the necessary environment variables
    const envCheck = {
      hasRegion: false,
      hasAccessKey: false, 
      hasSecretKey: false,
      hasBucketName: false
    };
    
    // Try to get environment variables from meta tags (if available)
    const metaTags = document.querySelectorAll('meta[name^="aws-"]');
    metaTags.forEach(tag => {
      const name = tag.getAttribute('name');
      const value = tag.getAttribute('content');
      
      if (name === 'aws-region' && value) envCheck.hasRegion = true;
      if (name === 'aws-access-key' && value) envCheck.hasAccessKey = true;
      if (name === 'aws-secret-key' && value) envCheck.hasSecretKey = true;
      if (name === 'aws-bucket-name' && value) envCheck.hasBucketName = true;
    });
    
    resultElement.innerHTML += `<br>Environment check: ${JSON.stringify(envCheck)}`;
    
    // Call the server API to test S3 connection
    const response = await fetch('/api/s3/test');
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      resultElement.innerHTML = `
        <span class="success">✅ S3 Connection Successful!</span>
        
        <h3>Connection Details:</h3>
        <pre>${JSON.stringify(data, null, 2)}</pre>
        
        <h3>Environment Variables:</h3>
        <pre>${JSON.stringify(envCheck, null, 2)}</pre>
        
        <p><strong>Note:</strong> Your application is successfully connecting to S3 through the server API.
        You should update your client-side code to use the server API endpoint for S3 operations
        instead of trying to import AWS SDK directly in the browser.</p>
      `;
    } else {
      resultElement.innerHTML = `
        <span class="error">❌ S3 Connection Failed</span>
        
        <h3>Error Details:</h3>
        <pre>${JSON.stringify(data, null, 2)}</pre>
        
        <h3>Environment Variables:</h3>
        <pre>${JSON.stringify(envCheck, null, 2)}</pre>
        
        <p><strong>Recommendation:</strong> Check your AWS environment variables on the server.
        Make sure your AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME
        environment variables are correctly set on your server.</p>
      `;
    }
  } catch (error) {
    resultElement.innerHTML = `
      <span class="error">❌ Test Failed</span>
      
      <h3>Error:</h3>
      <pre>${error.message || 'Unknown error'}</pre>
      
      <p><strong>Recommendation:</strong> Check that your server is running and the /api/s3/test 
      endpoint is properly implemented.</p>
    `;
    console.error('Error testing S3:', error);
  }
}; 