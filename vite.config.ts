import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { vitePluginVersionMark } from "vite-plugin-version-mark";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    vitePluginVersionMark({
      name: "Referee FYI",
      ifGitSHA: true,
      version: `${process.env.CF_PAGES_COMMIT_SHA}`,
    }),
    tsconfigPaths({}),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Referee FYI",
        short_name: "Referee",
        start_url: "/",
        display: "standalone",
        background_color: "#27272A",
        theme_color: "#27272A",
        description: "Helpful tools for VRC and VIQC Referees",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/icons/kv-48x48.png",
            sizes: "48x48",
            type: "image/png",
          },
          {
            src: "/icons/kv-72x72.png",
            sizes: "72x72",
            type: "image/png",
          },
          {
            src: "/icons/kv-96x96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "/icons/kv-144x144.png",
            sizes: "144x144",
            type: "image/png",
          },
          {
            src: "/icons/kv-168x168.png",
            sizes: "168x168",
            type: "image/png",
          },
          {
            src: "/icons/kv-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  base: "/",
});
