import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const clientRoot = fileURLToPath(new URL(".", import.meta.url));
const realClientRoot = fs.existsSync(clientRoot) ? fs.realpathSync(clientRoot) : clientRoot;

export default defineConfig({
  root: realClientRoot,
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    fs: {
      strict: false,
      allow: [
        realClientRoot,
        clientRoot,
        path.resolve(realClientRoot, ".."),
        path.resolve(clientRoot, "..")
      ]
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false
      },
      "/uploads": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 4173,
    strictPort: true
  },
  build: {
    target: "es2020",
    minify: "esbuild",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-framework": ["react", "react-dom", "react-router-dom"],
          "vendor-animation": ["framer-motion", "gsap"],
          "vendor-icons": ["lucide-react"]
        }
      }
    }
  }
});
