// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro as nitroPlugin } from "nitro/vite";

export default defineConfig({
  nitro: false,
  plugins: [
    nitroPlugin({
      preset: "node-server",
      handlers: [
        {
          route: "/**",
          handler: "./server/middleware/cache-control.ts",
          middleware: true,
        },
      ],
      routeRules: {
        "/assets/**": {
          headers: { "cache-control": "public, max-age=31536000, immutable" },
        },
        "/sw.js": {
          headers: {
            "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
            expires: "0",
            pragma: "no-cache",
            "service-worker-allowed": "/",
          },
        },
      },
    }),
  ],
});
