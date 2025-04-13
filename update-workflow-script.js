/**
 * Script to update the workflow to use our new development script with Replit fixes
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Updating workflow to use development script with Replit fixes...');

try {
  // Update the .replit file to use the new script
  const replitConfigPath = path.join(__dirname, '.replit');
  
  if (fs.existsSync(replitConfigPath)) {
    let replitConfig = fs.readFileSync(replitConfigPath, 'utf8');
    
    // Update the workflow task for "Start application"
    const startAppWorkflow = replitConfig.match(/\[\[workflows\.workflow\]\]\s*name = "Start application"[\s\S]*?waitForPort = 5000/g);
    
    if (startAppWorkflow) {
      const originalBlock = startAppWorkflow[0];
      const updatedBlock = originalBlock.replace(
        /args = "npm run dev"/,
        'args = "bash ./dev-with-replit-fixes.sh"'
      );
      
      replitConfig = replitConfig.replace(originalBlock, updatedBlock);
      fs.writeFileSync(replitConfigPath, replitConfig);
      console.log('Successfully updated Start application workflow in .replit file');
    } else {
      console.log('Start application workflow not found in .replit file');
    }
  } else {
    console.log('.replit file not found');
  }
  
  console.log('Workflow update complete!');
} catch (error) {
  console.error('Error updating workflow:', error);
}