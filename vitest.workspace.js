import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "./vite.config.ts",
  "./lib/share/vitest.config.ts",
  "./lib/consistency/vitest.config.ts",
]);
