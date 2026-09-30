import fs from "node:fs";
// Fix Windows junction / OneDrive symlink path mismatch strictly on Windows
if (process.platform === "win32") {
  try {
    const realCwd = fs.realpathSync(process.cwd());
    if (realCwd !== process.cwd()) {
      process.chdir(realCwd);
    }
  } catch {
    // Ignore in environments where realpath is unsupported
  }
}

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
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
