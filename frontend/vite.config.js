import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

const certDir = path.resolve(__dirname, "../backend/certs");
const keyPath = path.join(certDir, "10.0.0.48+2-key.pem");
const certPath = path.join(certDir, "10.0.0.48+2.pem");

const BACKEND_HOST = "10.0.0.48";
const BACKEND_PORT = 5443;

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5175,
    strictPort: true,
    https: {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    },
    proxy: {
      "/api": {
        target: `https://${BACKEND_HOST}:${BACKEND_PORT}`,
        changeOrigin: true,
        secure: false, // aceita certificados auto-assinados em dev
      },
      "/uploads": {
        target: `https://${BACKEND_HOST}:${BACKEND_PORT}`,
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: `https://${BACKEND_HOST}:${BACKEND_PORT}`,
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
