import http from "http";
import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { pool, testConnection } from "./config/db.js";
import { initSocket } from "./realtime/socket.js";

async function start() {
    const app = buildApp();

    await testConnection();

    const server = http.createServer(app);

    initSocket(server);

    server.listen(env.PORT, () => {
        logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, "API listening");
    });

    async function shutdown(signal) {
        logger.warn({ signal }, "Shutting down");
        server.close(async () => {
            try {
                await pool.end();
                logger.info("DB pool closed");
            } catch (err) {
                logger.error({ err }, "Error closing DB pool");
            } finally {
                process.exit(0);
            }
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
