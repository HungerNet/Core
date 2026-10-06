import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  envDir: "../../",
  plugins: [react()],
  server: { port: 4183 },
  preview: { port: 4183 },
  build: { outDir: "dist", emptyOutDir: true },
});
