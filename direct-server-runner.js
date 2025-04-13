/**
 * Direct server runner with Replit host fixes
 */

// Configure environment variables
process.env.REPLIT_ENVIRONMENT = 'true';
process.env.PORT = '5000';
process.env.VITE_DEV_SERVER_HOST = '0.0.0.0';
process.env.VITE_DEV_SERVER_PORT = '5000';

// Import and run the server
import('./server/direct-server.js')
  .then(() => {
    console.log('Server started successfully with direct configuration');
  })
  .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
