import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

const certDir = path.resolve(__dirname, "certs");
const keyPath = path.join(certDir, "lan-key.pem");
const certPath = path.join(certDir, "lan.pem");

// ajuste se seu IP mudar
const BACKEND_HOST = "10.0.0.48";
const BACKEND_PORT = 5051;

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    https: {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    },
    proxy: {
      "/api": {
        target: `http://${BACKEND_HOST}:${BACKEND_PORT}`,
        changeOrigin: true,
      },
      "/uploads": {
        target: `http://${BACKEND_HOST}:${BACKEND_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
