import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const clientRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: clientRoot,
  cacheDir: "node_modules/.vite",
  plugins: [react()],
  optimizeDeps: {
    esbuildOptions: {
      absWorkingDir: clientRoot
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    fs: {
      strict: true,
      allow: [clientRoot]
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
