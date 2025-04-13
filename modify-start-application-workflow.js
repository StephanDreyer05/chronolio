/**
 * Script to update the Start application workflow
 * This modifies the workflow to use our new combined fix script
 */

import fs from 'fs';
import path from 'path';

function updateWorkflow() {
  try {
    // Create a workflow.json file for modification
    const workflowContent = {
      workflows: {
        "Start application": {
          tasks: [
            {
              task: "packager.installForAll"
            },
            {
              task: "shell.exec",
              args: "bash ./replit-combined-fix.sh", 
              waitForPort: 5000
            }
          ]
        }
      }
    };
    
    // Write the workflow content to a temporary file
    fs.writeFileSync(
      'update-workflow.json', 
      JSON.stringify(workflowContent, null, 2),
      'utf8'
    );
    
    console.log("Created workflow update file. Please run: ");
    console.log("replit workflow modify-from-file update-workflow.json");
    console.log("");
    console.log("Since I cannot directly modify the Replit workflow, you will need to run this command in the Replit shell manually.");
    console.log("After running this command, you can restart the 'Start application' workflow to use the new fix.");
  } catch (error) {
    console.error("Error creating workflow file:", error);
  }
}

updateWorkflow();