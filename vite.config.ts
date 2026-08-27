/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Clean only Vite-emitted frontend assets under dist/.
 * Never touch dist/design or dist/uploads (live JSON store).
 */
function cleanFrontendAssets(): Plugin {
  const dist = path.resolve(__dirname, "dist");
  return {
    name: "apr-clean-frontend-assets",
    apply: "build",
    buildStart() {
      for (const name of ["index.html", "app.js", "styles.css"]) {
        const target = path.join(dist, name);
        if (existsSync(target)) rmSync(target, { force: true });
      }
      const assets = path.join(dist, "assets");
      if (existsSync(assets)) rmSync(assets, { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), cleanFrontendAssets()],
  build: {
    outDir: "dist",
    // Critical: do not wipe design/ + uploads/
    emptyOutDir: false,
    sourcemap: true,
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8080",
      "/design": "http://127.0.0.1:8080",
      "/uploads": "http://127.0.0.1:8080",
    },
  },
  test: {
    environment: "node",
  },
});
