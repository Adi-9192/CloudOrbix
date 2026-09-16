import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const emitSourcemaps = mode === "development";

  return {
    base: "/",
    build: {
      sourcemap: emitSourcemaps ? "inline" : false,
      minify: !emitSourcemaps,
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            if (id.includes("node_modules/recharts")) return "charts";
            if (id.includes("node_modules/lucide-react")) return "icons";
          },
        },
      },
    },
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": path.resolve(process.cwd(), "./src") } },
    server: {
      host: "0.0.0.0",
      port: Number(env.VITE_PORT || 8443),
      strictPort: true,
      proxy: { "/api": { target: `http://localhost:${env.PORT || "4000"}`, changeOrigin: true } },
    },
    preview: { host: "0.0.0.0", port: Number(env.VITE_PORT || 8443) },
  };
});
