import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
        .default("info"),

    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().positive().default(3306),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    DB_NAME: z.string().min(1),
    JWT_SECRET: z.string().min(10),
    JWT_ISSUER: z.string().min(1).default("intranet-rh"),
    JWT_AUDIENCE: z.string().min(1).default("intranet-colaboradores"),
    JWT_EXPIRES_IN: z.string().min(2).default("15m"),
    CORS_ORIGINS: z.string().optional()
});

export const env = EnvSchema.parse(process.env);
export const isProd = env.NODE_ENV === "production";
export const corsOrigins = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
