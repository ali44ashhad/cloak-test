import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_TARGET = process.env.VITE_API_TARGET ?? "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    strictPort: false,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: false,
        secure: false,
      },
      "/r": {
        target: API_TARGET,
        changeOrigin: false,
        secure: false,
      },
    },
  },
});
