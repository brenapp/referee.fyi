
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import { nodePolyfills } from "vite-plugin-node-polyfills"
import { VitePWA } from 'vite-plugin-pwa'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({ include: ["events"], protocolImports: true }),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        "name": "Referee FYI",
        "short_name": "Referee",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#27272A",
        "theme_color": "#27272A",
        "description": "Helpful tools for VRC and VIQC Referees",
        "orientation": "portrait-primary",
        "icons": [
          {
            "src": "/icons/kv-48x48.png",
            "sizes": "48x48",
            "type": "image/png"
          },
          {
            "src": "/icons/kv-72x72.png",
            "sizes": "72x72",
            "type": "image/png"
          },
          {
            "src": "/icons/kv-96x96.png",
            "sizes": "96x96",
            "type": "image/png"
          },
          {
            "src": "/icons/kv-144x144.png",
            "sizes": "144x144",
            "type": "image/png"
          },
          {
            "src": "/icons/kv-168x168.png",
            "sizes": "168x168",
            "type": "image/png"
          },
          {
            "src": "/icons/kv-192x192.png",
            "sizes": "192x192",
            "type": "image/png"
          }
        ]
      }
    })
  ],
  base: "/",
})