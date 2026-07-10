import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify("test")
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"]
  }
});
