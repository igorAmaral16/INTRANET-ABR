import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { pool, testConnection } from "./config/db.js";
import { initSocket } from "./realtime/socket.js";

async function start() {
    const app = buildApp();

    await testConnection();

    const server = http.createServer(app);

    // tenta criar servidor https quando ambas chaves forem fornecidas
    let httpsServer;
    if (env.SSL_KEY_PATH && env.SSL_CERT_PATH) {
        const resolveFile = (p) => {
            if (path.isAbsolute(p)) return p;
            return path.resolve(process.cwd(), p);
        };

        try {
            const keyPath = resolveFile(env.SSL_KEY_PATH);
            const certPath = resolveFile(env.SSL_CERT_PATH);
            const key = fs.readFileSync(keyPath);
            const cert = fs.readFileSync(certPath);
            httpsServer = https.createServer({ key, cert }, app);
        } catch (err) {
            logger.error({ err, key: env.SSL_KEY_PATH, cert: env.SSL_CERT_PATH }, "Falha ao carregar certificados HTTPS");
            throw err;
        }
    }

    // registra sockets em todos os servidores disponíveis
    initSocket(server);
    if (httpsServer) initSocket(httpsServer);

    const HOST = env.HOST || "0.0.0.0";
    const PORT = Number(env.PORT) || 5053;
    // evita conflito: se não informado, usa porta seguinte
    const HTTPS_PORT = env.HTTPS_PORT != null ? Number(env.HTTPS_PORT) : PORT + 1;

    // log de configuração de SSL
    if (env.SSL_KEY_PATH && env.SSL_CERT_PATH) {
        logger.info({ key: env.SSL_KEY_PATH, cert: env.SSL_CERT_PATH, httpsPort: HTTPS_PORT }, "HTTPS configuration detected");
    } else {
        logger.info("HTTPS not enabled (set SSL_KEY_PATH and SSL_CERT_PATH to enable)");
    }

    server.listen(PORT, HOST, () => {
        logger.info({ host: HOST, port: PORT, nodeEnv: env.NODE_ENV }, "API listening (HTTP)");
    });
    server.on("error", (err) => {
        logger.error({ err }, "HTTP server error");
    });

    if (httpsServer) {
        httpsServer.listen(HTTPS_PORT, HOST, () => {
            logger.info({ host: HOST, port: HTTPS_PORT, nodeEnv: env.NODE_ENV }, "API listening (HTTPS)");
        });
        httpsServer.on("error", (err) => {
            logger.error({ err }, "HTTPS server error");
        });
    }

    async function shutdown(signal) {
        logger.warn({ signal }, "Shutting down");
        const closePromises = [];
        closePromises.push(new Promise((r) => server.close(r)));
        if (httpsServer) closePromises.push(new Promise((r) => httpsServer.close(r)));

        Promise.all(closePromises)
            .then(async () => {
                try {
                    await pool.end();
                    logger.info("DB pool closed");
                } catch (err) {
                    logger.error({ err }, "Error closing DB pool");
                } finally {
                    process.exit(0);
                }
            })
            .catch((err) => {
                logger.error({ err }, "Error during server shutdown");
                process.exit(1);
            });

        setTimeout(() => {
            logger.fatal("Forced shutdown");
            process.exit(1);
        }, 10_000).unref();
    }

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    process.on("unhandledRejection", (reason) => {
        logger.error({ reason }, "Unhandled Rejection");
    });

    process.on("uncaughtException", (err) => {
        logger.fatal({ err }, "Uncaught Exception");
        process.exit(1);
    });
}

start().catch((err) => {
    logger.fatal({ err }, "Startup failed");
    process.exit(1);
});
