import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import packageJson from "./package.json";

export default defineConfig({
  base: "./",
  define: {
    __BUILD_ID__: JSON.stringify(`${packageJson.version}-offline`)
  },
  plugins: [react()],
  publicDir: false,
  build: {
    target: "es2022",
    outDir: "dist-offline",
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        codeSplitting: false
      }
    }
  }
});
