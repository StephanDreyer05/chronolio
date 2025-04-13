/**
 * Debug script to help diagnose issues with the public timeline sharing feature
 * 
 * Run with: node debug-shared-link.js
 */

(async () => {
  try {
    // Try to create a share directly by calling the API
    console.log('Attempting to create a public share for timeline ID 33...');
    
    const response = await fetch('http://localhost:3000/api/timelines/33/public-share', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      let errorText;
      try {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData, null, 2);
        console.error('Error response (JSON):', errorText);
        
        if (errorData.error) {
          console.log('\nDetailed error message:', errorData.error);
        }
      } catch (e) {
        errorText = await response.text();
        console.error('Error response (Text):', errorText);
      }
      
      console.log('\nStatus code explanation:');
      
      if (response.status === 401) {
        console.log('401 Unauthorized - You need to be logged in. Make sure you have an active session.');
      } else if (response.status === 404) {
        console.log('404 Not Found - Timeline with ID 33 does not exist, or does not belong to your user.');
      } else if (response.status === 500) {
        console.log('500 Internal Server Error - Server error occurred. Check the server logs for details.');
        console.log('Possible issues:');
        console.log('1. Database schema mismatch with the values being inserted');
        console.log('2. Missing required fields in the publicTimelineShares table');
        console.log('3. Database connection issues');
        console.log('4. Exception in the server code');
        
        // Check for specific error messages related to our fix
        if (errorText && errorText.includes("last_modified")) {
          console.log('\nLikely cause: The server is trying to insert a "last_modified" field that does not exist');
          console.log('Fix: Remove the last_modified field from the insert operation');
        }
      }
      
      console.log('\nSuggested fixes:');
      console.log('1. Make sure you\'re logged in and have a valid session');
      console.log('2. Verify the timeline ID exists in your database');
      console.log('3. Check the server logs for detailed error messages');
      console.log('4. Run database migrations if there have been schema changes');
    } else {
      const data = await response.json();
      console.log('Share created successfully!');
      console.log('Share data:', data);
      console.log('Share URL:', `${new URL('/public/timeline/' + data.shareToken, 'http://localhost:3000').toString()}`);
    }
  } catch (error) {
    console.error('Fatal error:', error);
  }
})(); 