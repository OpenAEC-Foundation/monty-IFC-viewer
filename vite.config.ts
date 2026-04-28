import { defineConfig, type Plugin } from "vite";
import { resolve } from "path";

const VIEWER_HTML = "/index.html";
const LANDING_HTML = "/landing/index.html";

function isAsset(path: string): boolean {
  return /\.[^/]+$/.test(path)
    || path.startsWith("/@")
    || path.startsWith("/__")
    || path.startsWith("/node_modules")
    || path.startsWith("/src/");
}

const cleanUrlRoutes: Plugin = {
  name: "monty-clean-urls",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const orig = req.url ?? "/";
      const [path, query] = orig.split("?", 2);

      if (path === "/" || path === "/landing" || path === "/landing/") return next();
      if (isAsset(path)) return next();

      const segs = path.split("/").filter(Boolean);
      const qs = query ? "?" + query : "";
      if (segs.length === 1) {
        req.url = LANDING_HTML + qs;
      } else if (segs.length === 2) {
        req.url = VIEWER_HTML + qs;
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [cleanUrlRoutes],
  appType: "mpa",
  server: {
    port: 3052,
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
