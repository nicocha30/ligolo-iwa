import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from 'path'

export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 0,
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      },
      input: {
        main: resolve(__dirname, 'index.html')
      },
    },
  },
  server: {
    port: 4321,
    hmr: false,
  },
  plugins: [react(), tsconfigPaths(), tailwindcss()],
})

