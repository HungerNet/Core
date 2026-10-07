import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  envDir: "../../",
  plugins: [react()],
  server: {
    port: 4181,
    proxy: {
      "/api/v1": {
        target: "https://api.hacklets.dev",
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: "",
      },
    },
  },
  preview: { port: 4181 },
  build: { outDir: "dist", emptyOutDir: true },
});
