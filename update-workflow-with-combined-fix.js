/**
 * Script to update the workflow to use our combined fix script
 */

import fs from 'fs';

async function updateWorkflow() {
  try {
    console.log('Updating workflow to use the combined fix script...');
    
    // Read the .replit file
    const replitConfig = fs.readFileSync('.replit', 'utf8');
    
    // Check if the workflow already exists
    const hasStartAppWorkflow = replitConfig.includes('[nix.channel]') || 
                              replitConfig.includes('channel = "stable-22_11"') ||
                              replitConfig.includes('[deployment]');
    
    // Create a new .replit configuration with the updated command
    let updatedConfig;
    
    if (hasStartAppWorkflow) {
      // Replace existing run command
      updatedConfig = replitConfig.replace(
        /run = ".*"/,
        'run = "bash ./replit-combined-fix.sh"'
      );
    } else {
      // Add new run command
      updatedConfig = replitConfig + '\nrun = "bash ./replit-combined-fix.sh"\n';
    }
    
    // Write the updated configuration
    fs.writeFileSync('.replit', updatedConfig);
    
    console.log('Workflow updated successfully!');
    console.log('The application will now start using replit-combined-fix.sh');
  } catch (error) {
    console.error('Error updating workflow:', error);
  }
}

updateWorkflow();