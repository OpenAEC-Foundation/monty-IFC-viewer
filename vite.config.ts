import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        landing: resolve(__dirname, "landing/index.html"),
      },
    },
  },
});
