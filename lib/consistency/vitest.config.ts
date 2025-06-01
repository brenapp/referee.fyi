import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    outDir: "dist",
  },
  test: {
    passWithNoTests: true,
  },
});
