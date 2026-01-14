import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import compression from "compression";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

import { logger } from "./utils/logger.js";
import { corsOrigins } from "./config/env.js";
import { router } from "./routes/index.js";
import { notFound } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildApp() {
    const app = express();
    app.locals.startedAt = new Date().toISOString();

    app.use(
        pinoHttp({
            logger,
            genReqId: (req) => {
                const incoming = req.headers["x-request-id"];
                return typeof incoming === "string" && incoming.trim()
                    ? incoming
                    : randomUUID();
            }
        })
    );

    app.use((req, res, next) => {
        res.setHeader("X-Request-Id", req.id);
        next();
    });

    app.use(helmet());

    app.use(
        cors({
            origin: (origin, cb) => {
                if (!origin) return cb(null, true);
                if (!corsOrigins.length) return cb(null, true);
                if (corsOrigins.includes(origin)) return cb(null, true);
                return cb(new Error("CORS blocked"));
            },
            credentials: true
        })
    );

    app.use(
        rateLimit({
            windowMs: 60 * 1000,
            limit: 300,
            standardHeaders: "draft-7",
            legacyHeaders: false
        })
    );

    app.use(compression());
    app.use(express.json({ limit: "1mb" }));

    app.use("/uploads", express.static(path.join(__dirname, "..", "uploads"), {
        fallthrough: false,
        maxAge: "7d"
    }));

    app.use(router);

    app.use(notFound);
    app.use(errorHandler);

    return app;
}
