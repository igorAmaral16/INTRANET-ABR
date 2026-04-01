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
                translateTime: "HH:mm:ss Z",
                ignore: "pid,hostname",
                singleLine: false,
            }
        },
    redact: {
        paths: ["req.headers.authorization", "req.headers.cookie"],
        censor: "[REDACTED]"
    }
});

/**
 * Formata uma duração em ms para formato legível
 */
function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}min`;
}

/**
 * Retorna cor ANSI para status HTTP baseado no código
 */
function getStatusColor(statusCode, isProd) {
    if (isProd) return "";
    if (statusCode < 300) return "\x1b[32m"; // verde
    if (statusCode < 400) return "\x1b[36m"; // cyan
    if (statusCode < 500) return "\x1b[33m"; // amarelo
    return "\x1b[31m"; // vermelho
}

function resetColor(isProd) {
    return isProd ? "" : "\x1b[0m";
}

/**
 * Helper para logar requisições HTTP com detalhes humanizados
 */
export function logRequest(req, res = null, details = {}) {
    const timestamp = new Date().toLocaleTimeString("pt-BR", { 
        hour12: false, 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit" 
    });
    
    if (!res) {
        // Log de requisição recebida
        const method = req.method;
        const path = req.path || req.url;
        const userInfo = req.user ? ` [user: ${req.user.username || req.user.id}]` : "";
        const extraInfo = details.message ? ` - ${details.message}` : "";
        
        logger.info({
            timestamp,
            requestId: req.id,
            method,
            path,
            user: req.user?.username || req.user?.id || "anon",
            ...details
        }, `[${timestamp}] ${method} ${path}${userInfo}${extraInfo}`);
    } else {
        // Log de resposta
        const method = req.method;
        const path = req.path || req.url;
        const statusCode = res.statusCode;
        const duration = res.locals?.duration || "?";
        const userInfo = req.user ? ` [user: ${req.user.username || req.user.id}]` : "";
        const durationFormatted = typeof duration === "number" ? formatDuration(duration) : duration;
        const statusColor = getStatusColor(statusCode, isProd);
        const resetCol = resetColor(isProd);
        
        const statusMsg = statusColor + statusCode + resetCol;
        
        logger.info({
            timestamp,
            requestId: req.id,
            method,
            path,
            statusCode,
            duration: durationFormatted,
            user: req.user?.username || req.user?.id || "anon",
            ...details
        }, `[${timestamp}] ${method} ${path} ${statusMsg} ${durationFormatted}${userInfo}`);
    }
}

/**
 * Helper para logar sucessos de operação
 */
export function logSuccess(message, data = {}) {
    const timestamp = new Date().toLocaleTimeString("pt-BR", { 
        hour12: false,
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit" 
    });
    logger.info({ timestamp, ...data }, `[${timestamp}] SUCCESS: ${message}`);
}

/**
 * Helper para logar erros
 */
export function logError(message, error, context = {}) {
    const timestamp = new Date().toLocaleTimeString("pt-BR", { 
        hour12: false,
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit" 
    });
    const errorMsg = error?.message || String(error);
    const stack = error?.stack;
    logger.error({ 
        timestamp, 
        error: errorMsg, 
        stack,
        ...context 
    }, `[${timestamp}] ERROR: ${message} - ${errorMsg}`);
}

/**
 * Helper para logar avisos
 */
export function logWarning(message, data = {}) {
    const timestamp = new Date().toLocaleTimeString("pt-BR", { 
        hour12: false,
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit" 
    });
    logger.warn({ timestamp, ...data }, `[${timestamp}] WARNING: ${message}`);
}

/**
 * Helper para logar informações importantes no startup
 */
export function logStartup(message, data = {}) {
    const timestamp = new Date().toLocaleTimeString("pt-BR", { 
        hour12: false,
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit" 
    });
    logger.info({ timestamp, ...data }, `[${timestamp}] STARTUP: ${message}`);
}
