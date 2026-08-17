/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 12000,
    host: true,
    allowedHosts: [
      "work-1-jsltvrsigzivgxxl.prod-runtime.all-hands.dev",
      "work-2-jsltvrsigzivgxxl.prod-runtime.all-hands.dev",
    ],
  },
  preview: {
    port: 12000,
    host: true,
  },
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.{test,spec}.ts", "src/**/__tests__/**/*.ts"],
  },
});
