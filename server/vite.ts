import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer } from "vite";
import type { ViteDevServer } from "vite";
import { createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config.js";
import viteConfig from "../vite.config";
import allowedHosts from "./config/allowed-hosts.js";


// Detect Replit environment
const isReplitEnvironment = process.env.REPLIT_ENVIRONMENT || process.env.REPL_ID || process.env.REPL_SLUG;
if (isReplitEnvironment) {
  console.log('Replit environment detected, applying Vite patches for HMR and host configuration');
  process.env.REPLIT_ENVIRONMENT = 'true';
  
  // Allow Replit domains in the server configuration
  const allowedHosts = ["46bfefbe-87e0-47ab-a4cd-257bbfc52f52-00-lgtzqxecujzm.riker.replit.dev",true,"69f0d20e4661-00-*.replit.dev","69f0d20e4661-00-*.riker.replit.dev","69f0d20e4661.id.replit.dev","69f0d20e4661.repl.co","*.replit.dev","*.riker.replit.dev"];
  console.log('Allowing Replit hosts:', allowedHosts);
  
  // Modify viteConfig to accept Replit hosts
  if (viteConfig.server) {
    viteConfig.server.host = true;
    viteConfig.server.hmr = viteConfig.server.hmr || {};
    viteConfig.server.hmr.clientPort = 443;
  }
}

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        if (
          msg.includes("[TypeScript] Found 0 errors. Watching for file changes")
        ) {
          log("no errors found", "tsc");
          return;
        }

        if (msg.includes("[TypeScript] ")) {
          const [errors, summary] = msg.split("[TypeScript] ", 2);
          log(`${summary} ${errors}\u001b[0m`, "tsc");
          return;
        } else {
          viteLogger.error(msg, options);
          process.exit(1);
        }
      },
    },
    server: {
      allowedHosts,
      middlewareMode: true,
      hmr: { 
        server,
        clientPort: process.env.REPLIT_ENVIRONMENT ? 443 : undefined,
        port: process.env.REPLIT_ENVIRONMENT ? 443 : undefined,
      },
      // Allow Replit hosts
      host: process.env.REPLIT_ENVIRONMENT ? true : false,
      // REPLIT HOST PATCH APPLIED
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Check if the request is for an HTML page (simple check)
    if (url.endsWith("/") || url.endsWith(".html") || !path.extname(url)) {
      try {
        // Resolve index.html relative to the client root defined in vite.config.ts
        // Note: Vite's root is 'client', so index.html is at the root from Vite's perspective.
        const clientRoot = path.resolve(__dirname, "..", "client"); 
        const clientIndexHtml = path.resolve(clientRoot, "index.html");
        
        // Read the original index.html template
        let template = await fs.promises.readFile(clientIndexHtml, "utf-8");
        
        // Apply Vite transformations (like injecting scripts, HMR client)
        template = await vite.transformIndexHtml(url, template);
        
        // Send the transformed HTML
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        // If an error occurs, pass it to the next error handler
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    } else {
      // For non-HTML requests, let other middleware (like Vite's static asset serving) handle it.
      next();
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "../dist/public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
