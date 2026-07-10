import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import packageJson from "./package.json";

const processEnv = (
  globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }
).process?.env;
const buildId = processEnv?.GITHUB_SHA ?? packageJson.version;

export default defineConfig({
  base: "./",
  define: {
    __BUILD_ID__: JSON.stringify(buildId)
  },
  plugins: [react()],
  publicDir: "static",
  build: {
    target: "es2022",
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40
            },
            {
              name: "drag-drop",
              test: /node_modules[\\/]@dnd-kit[\\/]/,
              priority: 30
            },
            {
              name: "icons",
              test: /node_modules[\\/]lucide-react[\\/]/,
              priority: 20
            },
            {
              name: "encoding",
              test: /node_modules[\\/]encoding-japanese[\\/]/,
              priority: 20
            }
          ]
        }
      }
    }
  }
});
