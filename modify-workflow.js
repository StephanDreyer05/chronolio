/**
 * Script to modify the workflow to use our fixed development script
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Modifying workflow to use our fixed development script...');

try {
  // Update the .replit file to use the new script
  const replitConfigPath = path.join(__dirname, '.replit');
  
  if (fs.existsSync(replitConfigPath)) {
    const replitConfig = fs.readFileSync(replitConfigPath, 'utf8');
    const updatedConfig = replitConfig.replace(
      /run = "npm run dev"/g,
      'run = "bash ./dev-with-fixes.sh"'
    );
    
    fs.writeFileSync(replitConfigPath, updatedConfig);
    console.log('Successfully updated .replit file');
  } else {
    console.log('.replit file not found');
  }

  console.log('Workflow modification complete!');
} catch (error) {
  console.error('Error modifying workflow:', error);
}