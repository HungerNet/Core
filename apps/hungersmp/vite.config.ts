import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  envDir: "../../",
  plugins: [react()],
  server: { port: 4182 },
  preview: { port: 4182 },
  build: { outDir: "dist", emptyOutDir: true },
});
