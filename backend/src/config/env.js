import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
        .default("info"),

    DB_HOST: z.string().min(1).default("127.0.0.1"),
    DB_PORT: z.coerce.number().int().positive().default(3306),
    DB_USER: z.string().min(1).default("root"),
    DB_PASSWORD: z.string().min(1).default("123456"),
    DB_NAME: z.string().min(1).default("intranet_rh"),
    JWT_SECRET: z.string().min(10).default("default_secret"),
    JWT_ISSUER: z.string().min(1).default("intranet-rh"),
    JWT_AUDIENCE: z.string().min(1).default("intranet-colaboradores"),
    JWT_EXPIRES_IN: z.string().min(2).default("15m"),
    CORS_ORIGINS: z.string().optional(),  // Tornando opcional

    // habilita HTTPS se as duas variáveis abaixo estiverem presentes
    SSL_KEY_PATH: z.string().min(1).optional(),
    SSL_CERT_PATH: z.string().min(1).optional(),
    HTTPS_PORT: z.coerce.number().int().positive().optional()
});

export const env = EnvSchema.parse(process.env);
export const isProd = env.NODE_ENV === "production";
export const corsOrigins = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

// Log de configurações de ambiente carregadas
if (!isProd) {
    console.log("[ENVIRONMENT LOADED]", {
        NODE_ENV: env.NODE_ENV,
        PORT: env.PORT,
        LOG_LEVEL: env.LOG_LEVEL,
        DB_HOST: env.DB_HOST,
        DB_PORT: env.DB_PORT,
        DB_NAME: env.DB_NAME,
        CORS_ORIGINS_COUNT: corsOrigins.length,
        HTTPS_ENABLED: Boolean(env.SSL_KEY_PATH && env.SSL_CERT_PATH)
    });
}
