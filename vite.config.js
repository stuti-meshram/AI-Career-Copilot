import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Proxy Anthropic API calls to avoid CORS issues in dev
  // In production, use a backend proxy (never expose API key in frontend!)
  server: {
    port: 5173,
    proxy: {
      "/api/anthropic": {
        target: "https://api.anthropic.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader(
              "x-api-key",
              process.env.VITE_ANTHROPIC_API_KEY || ""
            );
            proxyReq.setHeader("anthropic-version", "2023-06-01");
            proxyReq.setHeader(
              "anthropic-beta",
              "web-search-2025-03-05"
            );
          });
        },
      },
    },
  },

  // Environment variable exposure (only VITE_ prefixed vars are exposed)
  // NEVER commit your actual API key — use .env.local
  define: {
    __APP_VERSION__: JSON.stringify("0.1.0"),
  },
});
