import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), runtimeErrorOverlay(), themePlugin()],
  resolve: {
    alias: {
      "@db": path.resolve(__dirname, "db"),
      "@": path.resolve(__dirname, "client/src"),
    },
  },
  root: path.resolve(__dirname, "client"),
  server: {
    host: '0.0.0.0',
    port: 5000
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      // Externalize AWS SDK modules to prevent build errors
      external: [
        '@aws-sdk/client-s3',
        '@aws-sdk/s3-request-presigner',
        /^@aws-sdk\/.*/,  // Match all AWS SDK modules
        /^@smithy\/.*/    // Match all Smithy modules (AWS SDK dependencies)
      ],
      // Tell Rollup what to do when it encounters these externalized modules
      output: {
        globals: {
          '@aws-sdk/client-s3': 'AWS_SDK_S3',
          '@aws-sdk/s3-request-presigner': 'AWS_SDK_Presigner'
        }
      }
    },
    // Ensure the AWS SDK imports are properly handled
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
});
