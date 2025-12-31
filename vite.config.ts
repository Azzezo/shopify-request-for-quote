import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144102176
// Replace the host config if you want to use the HMR in the container.
declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  server: {
    port: Number(process.env.PORT || 3000),
    hmr: {
      port: Number(process.env.HMR_PORT || 3001),
    },
    fs: {
      allow: ["app", "node_modules"],
    },
  },
  plugins: [
    remix({
      ignoredRouteFiles: ["**/*.css"],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
        v3_singleFetch: true,
      },
    }),
    tsconfigPaths(),
  ],
  build: {
    assetsInlineLimit: 0,
  },
});

