import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { vitePluginVersionMark } from "vite-plugin-version-mark";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";
import { exec } from "node:child_process";

// Generate version.json
import { type Plugin } from "vite";

const execCommand = (command: string) => {
  return new Promise<string>((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        const output = stdout.toString()?.replace("\n", "");
        resolve(output);
      }
    });
  });
};

const generateVersionJson: Plugin = {
  name: "generate-version-json",
  apply: "build",
  async buildStart() {
    const output = await execCommand("git rev-parse --short HEAD");
    const version = output.toString().trim();
    this.emitFile({
      type: "asset",
      fileName: "version.json",
      source: JSON.stringify({
        version,
      }),
    });
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    vitePluginVersionMark({
      name: "Referee FYI",
      ifGitSHA: true,
      version: `${process.env.CF_PAGES_COMMIT_SHA}`,
    }),
    generateVersionJson,
    tsconfigPaths({}),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "inline",
      includeAssets: ["./rules/**/*.json", "rules.json", "updateNotes.md"],
      manifest: {
        id: "app.bren.kv.v1",
        name: "Referee FYI",
        short_name: "Referee",
        start_url: "/",
        display: "standalone",
        background_color: "#27272A",
        theme_color: "#27272A",
        description:
          "Digital anomaly log for Head Referees in VRC, VIQRC, and VEX U. Referee FYI allows you to quickly record violations, see summaries before a match, and share your log with others.",
        orientation: "portrait-primary",

        launch_handler: {
          client_mode: ["navigate-existing", "auto"],
        },
        icons: [
          {
            src: "/icons/referee-fyi-48x48.png",
            sizes: "48x48",
            type: "image/png",
          },
          {
            src: "/icons/referee-fyi-72x72.png",
            sizes: "72x72",
            type: "image/png",
          },
          {
            src: "/icons/referee-fyi-96x96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "/icons/referee-fyi-144x144.png",
            sizes: "144x144",
            type: "image/png",
          },
          {
            src: "/icons/referee-fyi-168x168.png",
            sizes: "168x168",
            type: "image/png",
          },
          {
            src: "/icons/referee-fyi-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/referee-fyi-256x256.png",
            sizes: "256x256",
            type: "image/png",
          },
          {
            src: "/icons/referee-fyi-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/referee-fyi.svg",
            sizes: "512x512",
            type: "image/svg",
          },
        ],
        screenshots: [
          {
            src: "/screenshots/screenshot1.png",
            sizes: "1080x2400",
            label:
              "The match list view for the 2023 VEX Robotics World Championship High School Division.",
          },
          {
            src: "/screenshots/screenshot2.png",
            sizes: "1080x2400",
            label:
              "The match dialog, containing a general note and a major violation on a team.",
          },
          {
            src: "/screenshots/screenshot3.png",
            sizes: "1080x2400",
            label:
              "The manage tab, which allows you to share the anomaly log with others.",
          },
          {
            src: "/screenshots/screenshot4.png",
            sizes: "1080x2400",
            label: "The home screen, where you select relevant events.",
          },
        ],
      },
      workbox: {
        // All /api/* routes should always go to the server
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
    sentryVitePlugin({
      org: "referee-fyi",
      project: "referee-fyi",
    }),
  ],

  base: "/",
  build: {
    sourcemap: true,
  },
});
