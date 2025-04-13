/**
 * Script to update the workflow to use our direct Vite fix script
 */

const fs = require('fs');

async function updateWorkflow() {
  console.log('Updating Replit workflow to use improved direct fix...');
  
  // Path to the .replit file
  const replitFilePath = './.replit';
  
  try {
    // Check if .replit file exists
    if (!fs.existsSync(replitFilePath)) {
      console.error('.replit file not found. Make sure you are running this in the root directory.');
      return;
    }
    
    // Read the current content
    let replitContent = fs.readFileSync(replitFilePath, 'utf8');
    
    // Look for the run command in the [Start application] workflow
    const originalRun = /\[nix\.channel\]\s+channel\s+=\s+"stable"/;
    const workflowSection = /\[deployment\]\s+run\s+=\s+\[.*?\]/;
    
    if (replitContent.includes('[deployment]')) {
      console.log('Found deployment section, updating...');
      
      // Update the deployment section for production
      replitContent = replitContent.replace(
        /\[deployment\]\s+run\s+=\s+\[.*?\]/g,
        '[deployment]\n  run = ["bash", "-c", "NODE_ENV=production node dist/index.js"]'
      );
      
      // Update the build command for production
      replitContent = replitContent.replace(
        /\[deployment\]\s+build\s+=\s+\[.*?\]/g,
        '[deployment]\n  build = ["bash", "-c", "bash ./improved-build-for-replit.sh"]'
      );
      
      console.log('Updated deployment section with improved build script');
    } else {
      console.log('Deployment section not found, adding it...');
      
      // Add deployment section at the end
      replitContent += `
[deployment]
  run = ["bash", "-c", "NODE_ENV=production node dist/index.js"]
  build = ["bash", "-c", "bash ./improved-build-for-replit.sh"]
`;
      console.log('Added deployment section with improved build script');
    }
    
    // Check if there's a workflow named 'Start application'
    if (replitContent.includes('[Start application]')) {
      console.log('Found Start application workflow, updating...');
      
      // Update the workflow command
      replitContent = replitContent.replace(
        /\[Start application\]\s+command\s+=\s+".*?"/g,
        '[Start application]\n  command = "bash ./improved-vite-fix.sh"'
      );
      
      console.log('Updated Start application workflow with improved Vite fix');
    } else {
      console.log('Start application workflow not found, adding it...');
      
      // Add the workflow section at the end
      replitContent += `
[Start application]
  command = "bash ./improved-vite-fix.sh"
`;
      console.log('Added Start application workflow with improved Vite fix');
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(replitFilePath, replitContent);
    
    console.log('Workflow update complete!');
    console.log('The application will now use:');
    console.log('- For development: bash ./improved-vite-fix.sh');
    console.log('- For deployment build: bash ./improved-build-for-replit.sh');
    console.log('- For deployment run: NODE_ENV=production node dist/index.js');
    
  } catch (error) {
    console.error('Error updating workflow:', error);
  }
}

// Run the update function
updateWorkflow();