import pino from "pino";
import { env, isProd } from "../config/env.js";

export const logger = pino({
    level: env.LOG_LEVEL,
    base: { service: "intranet-rh", env: env.NODE_ENV },
    transport: isProd
        ? undefined
        : {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname"
            }
        },
    redact: {
        paths: ["req.headers.authorization", "req.headers.cookie"],
        censor: "[REDACTED]"
    }
});
