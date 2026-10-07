import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  envDir: "../../",
  plugins: [react()],
  server: {
    port: 4174,
    proxy: {
      "/api/v1": {
        target: "https://api.hacklets.dev",
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: "",
      },
    },
  },
  preview: { port: 4174 },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
