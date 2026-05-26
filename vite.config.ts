import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import path from "node:path";
import manifest from "./manifest.config.js";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@core": path.resolve(__dirname, "src/core"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: "node",
    environmentMatchGlobs: [
      ["src/**/*.tsx.test.ts", "jsdom"],
      ["src/sidepanel/**/*.test.tsx", "jsdom"],
      ["src/popup/**/*.test.tsx", "jsdom"],
      ["src/options/**/*.test.tsx", "jsdom"],
    ],
    include: [
      "test/**/*.test.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "server/**/*.test.ts",
    ],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/core/**/*.ts"],
    },
  },
});
