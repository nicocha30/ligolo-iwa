import { resolve } from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "./",
  build: {
    assetsInlineLimit: 0,
    outDir: "dist",
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (
            id.includes("@chainsafe") ||
            id.includes("@libp2p") ||
            id.includes("it-handshake") ||
            id.includes("it-pipe") ||
            id.includes("it-stream") ||
            id.includes("it-ws") ||
            id.includes("msgpackr") ||
            id.includes("stream-to-it") ||
            id.includes("uint8arraylist")
          ) {
            return "ligolo-session";
          }

          if (
            id.includes("@heroui") ||
            id.includes("@iconify") ||
            id.includes("framer-motion")
          ) {
            return "ui-vendor";
          }

          if (id.includes("react")) {
            return "react-vendor";
          }

          return undefined;
        },
      },
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },
  server: {
    port: 4321,
    hmr: false,
  },
  plugins: [react(), tsconfigPaths(), tailwindcss()],
});
