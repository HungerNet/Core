import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const { VITE_API_PROXY_TARGET } = loadEnv(mode, "../../", "VITE_");
  return {
    envDir: "../../",
    plugins: [react()],
    server: {
      port: 4181,
      proxy: {
        "/api/v1": {
          target: VITE_API_PROXY_TARGET || "http://localhost:8000",
          changeOrigin: true,
          secure: true,
          cookieDomainRewrite: "",
        },
      },
    },
    preview: { port: 4181 },
    build: { outDir: "dist", emptyOutDir: true },
  };
});
