/**
 * Direct development server runner with Replit host fixes
 */

// Sets environment variables
process.env.REPLIT_ENVIRONMENT = 'true';
process.env.PORT = '5000';
process.env.VITE_DEV_SERVER_HOST = '0.0.0.0';
process.env.VITE_DEV_SERVER_PORT = '5000';

// Run the server with direct configuration
import("./server/vite-override.js")
  .then(() => {
    console.log("Development server with Replit fixes started");
  })
  .catch(err => {
    console.error("Failed to start development server:", err);
    process.exit(1);
  });
