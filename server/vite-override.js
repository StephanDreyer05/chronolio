/**
 * Direct Vite server configuration override
 * This file will be used instead of the original vite.ts
 */

import { createServer } from "http";
import express from "express";
import { createViteServer } from "./vite.js";

const port = process.env.PORT || 5000;
const app = express();
const server = createServer(app);

// Create and configure Vite server with direct access to config
async function createDevServer() {
  // Special configuration for Replit
  const specificHost = "46bfefbe-87e0-47ab-a4cd-257bbfc52f52-00-lgtzqxecujzm.riker.replit.dev";
  
  // Create Vite with explicit configuration
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: { 
        server,
        clientPort: 443,
        host: specificHost,
      },
      host: true,
      port: 5000,
      strictPort: true,
      allowedHosts: [
        specificHost,
        true, // Allow all hosts
        "*.replit.dev",
        "*.riker.replit.dev"
      ]
    }
  });

  app.use(vite.middlewares);
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server with direct Replit host fix running at http://0.0.0.0:${port}`);
  });
}

createDevServer();
