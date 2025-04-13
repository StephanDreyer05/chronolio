/**
 * Test script for vercel-router-fix.js
 * 
 * This script creates a temporary test file with directory imports,
 * runs the vercel-router-fix utility on it, and verifies the imports
 * were properly converted.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Create a temporary test file
const TEST_FILE = 'test-vercel-import.js';
const ROUTER_FIX_SCRIPT = './vercel-router-fix.js';

// Test content with various import patterns
const testContent = `import express from 'express';
import cors from 'cors';
import { setupRoutes } from './server/routes';
import { setupAuthRoutes } from './server/auth';
import { aiRoutes } from './server/routes/ai';
import { subscriptionRoutes } from './server/routes/subscription';
import { setupPaymentService } from './server/services/payment';
import { something } from './server/endpoints/';

// This is just a test file
const app = express();
app.use(cors());

// Setup routes
setupRoutes(app);
setupAuthRoutes(app);
aiRoutes(app);
subscriptionRoutes(app);
`;

// Expected output after fix
const expectedContent = `import express from 'express';
import cors from 'cors';
import { setupRoutes } from './server/routes.js';
import { setupAuthRoutes } from './server/auth.js';
import { aiRoutes } from './server/routes/ai.js';
import { subscriptionRoutes } from './server/routes/subscription.js';
import { setupPaymentService } from './server/services/payment.js';
import { something } from './server/endpoints/index.js';

// This is just a test file
const app = express();
app.use(cors());

// Setup routes
setupRoutes(app);
setupAuthRoutes(app);
aiRoutes(app);
subscriptionRoutes(app);
`;

async function runTest() {
  console.log('🧪 Testing the vercel-router-fix utility');
  
  try {
    // Step 1: Make sure the router fix script exists
    if (!fs.existsSync(ROUTER_FIX_SCRIPT)) {
      console.error('❌ Router fix script not found:', ROUTER_FIX_SCRIPT);
      return false;
    }
    
    // Step 2: Create a test file with directory imports
    console.log('📝 Creating test file with directory imports...');
    fs.writeFileSync(TEST_FILE, testContent);
    
    // Step 3: Modify the router fix script to target our test file
    // We'll do this by temporarily replacing vercel.js with our test file
    console.log('🔧 Running router fix on test file...');
    
    // Read the original script
    const routerFixContent = fs.readFileSync(ROUTER_FIX_SCRIPT, 'utf8');
    
    // Create a modified version targeting our test file
    const modifiedScript = routerFixContent.replace(
      "const VERCEL_FILE = './vercel.js';",
      `const VERCEL_FILE = './${TEST_FILE}';`
    );
    
    const TEST_SCRIPT = 'temp-router-fix.js';
    fs.writeFileSync(TEST_SCRIPT, modifiedScript);
    
    // Step 4: Run the modified script
    return new Promise((resolve) => {
      exec(`node ${TEST_SCRIPT}`, (error, stdout, stderr) => {
        console.log('\n🖨️  Script output:');
        console.log(stdout);
        
        if (error) {
          console.error('❌ Error running script:', stderr);
          cleanup();
          resolve(false);
          return;
        }
        
        // Step 5: Verify the output file
        console.log('\n🔍 Verifying results...');
        const outputContent = fs.readFileSync(TEST_FILE, 'utf8');
        
        // Compare with expected content
        if (outputContent.trim() === expectedContent.trim()) {
          console.log('✅ TEST PASSED - All imports were properly converted!');
          console.log('\nBefore:');
          console.log(testContent);
          console.log('\nAfter:');
          console.log(outputContent);
          cleanup();
          resolve(true);
        } else {
          console.log('❌ TEST FAILED - Output does not match expected result');
          console.log('\nExpected:');
          console.log(expectedContent);
          console.log('\nReceived:');
          console.log(outputContent);
          cleanup();
          resolve(false);
        }
      });
    });
  } catch (err) {
    console.error('❌ Error during test:', err);
    cleanup();
    return false;
  }
}

function cleanup() {
  console.log('\n🧹 Cleaning up test files...');
  if (fs.existsSync(TEST_FILE)) {
    fs.unlinkSync(TEST_FILE);
  }
  if (fs.existsSync('temp-router-fix.js')) {
    fs.unlinkSync('temp-router-fix.js');
  }
}

// Run the test
runTest().then((success) => {
  console.log('\n🏁 Test completed.');
  if (success) {
    console.log('✨ The router fix utility is working correctly!');
  } else {
    console.log('⚠️ The router fix utility needs attention.');
  }
});