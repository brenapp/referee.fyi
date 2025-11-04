import { defineConfig } from "cypress";

const baseUrl = process.env.CYPRESS_BASE_URL || "https://mac.bren.haus";

export default defineConfig({
  e2e: {
    baseUrl,
    setupNodeEvents(on, config) {},
  },
});
