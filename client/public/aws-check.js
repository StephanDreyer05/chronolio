/**
 * AWS SDK Availability Check
 * 
 * This script runs in the browser to test if AWS SDK is correctly loaded
 * and accessible from the client side. It will create a diagnostic log
 * that can help troubleshoot S3 integration issues.
 */
(function() {
  const resultElement = document.getElementById('aws-sdk-test-result');
  if (!resultElement) return;
  
  resultElement.innerHTML = '<p>Testing AWS SDK availability...</p>';
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  function addResult(name, success, details = null) {
    results.tests.push({
      name,
      success,
      details: details || (success ? 'Successful' : 'Failed')
    });
    updateDisplay();
  }
  
  function updateDisplay() {
    let html = `<h3>AWS SDK Test Results</h3>
                <p>Timestamp: ${results.timestamp}</p>
                <ul>`;
    
    results.tests.forEach(test => {
      html += `<li>
                <strong>${test.name}:</strong> 
                <span class="${test.success ? 'text-green-500' : 'text-red-500'}">
                  ${test.success ? 'Passed' : 'Failed'}
                </span>
                <p>${test.details}</p>
              </li>`;
    });
    
    html += '</ul>';
    resultElement.innerHTML = html;
  }
  
  // Test 1: Check for environment variables
  try {
    const envVars = {
      hasRegion: !!window.env?.VITE_AWS_REGION,
      hasAccessKey: !!window.env?.VITE_AWS_ACCESS_KEY_ID,
      hasSecretKey: !!window.env?.VITE_AWS_SECRET_ACCESS_KEY,
      hasBucketName: !!window.env?.VITE_AWS_S3_BUCKET_NAME
    };
    
    const missingVars = Object.entries(envVars)
      .filter(([_, hasValue]) => !hasValue)
      .map(([name]) => name);
    
    if (missingVars.length === 0) {
      addResult('Environment Variables', true);
    } else {
      addResult('Environment Variables', false, `Missing: ${missingVars.join(', ')}`);
    }
  } catch (error) {
    addResult('Environment Variables', false, `Error checking: ${error.message}`);
  }
  
  // Test 2: Check if we can load AWS SDK
  try {
    Promise.all([
      import('@aws-sdk/client-s3').catch(e => ({ error: e })),
      import('@aws-sdk/s3-request-presigner').catch(e => ({ error: e }))
    ]).then(([s3Module, presignerModule]) => {
      if (s3Module.error) {
        addResult('Load AWS SDK Client', false, `Error: ${s3Module.error.message}`);
      } else {
        addResult('Load AWS SDK Client', true);
      }
      
      if (presignerModule.error) {
        addResult('Load AWS SDK Presigner', false, `Error: ${presignerModule.error.message}`);
      } else {
        addResult('Load AWS SDK Presigner', true);
      }
      
      // Test 3: Create S3 client if both modules loaded
      if (!s3Module.error && !presignerModule.error) {
        try {
          const S3Client = s3Module.S3Client;
          const client = new S3Client({
            region: 'us-east-1',
            credentials: {
              accessKeyId: 'TEST_KEY',
              secretAccessKey: 'TEST_SECRET'
            }
          });
          
          addResult('Create S3 Client', true);
          
          // Additional check: Is the client the right type?
          if (client.constructor.name === 'S3Client') {
            addResult('S3 Client Type', true);
          } else {
            addResult('S3 Client Type', false, `Expected S3Client but got ${client.constructor.name}`);
          }
        } catch (error) {
          addResult('Create S3 Client', false, `Error: ${error.message}`);
        }
      }
    });
  } catch (error) {
    addResult('Dynamic Import', false, `Fatal error: ${error.message}`);
  }
})(); 