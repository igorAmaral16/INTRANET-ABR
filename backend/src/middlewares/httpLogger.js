import { logger } from "../utils/logger.js";

/**
 * Middleware para logar requisições e respostas HTTP com detalhes humanizados
 */
export function httpLogger(req, res, next) {
    // Captura o início da requisição
    const startTime = Date.now();
    const method = req.method;
    const path = req.originalUrl || req.url;
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const userAgent = req.get("user-agent") || "unknown";

    // Log de origem para acesso
    const user = req.user?.username || req.user?.id || "anonymous";
    const timestamp = new Date().toLocaleTimeString("pt-BR", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    // Dados da requisição
    const reqLog = {
        timestamp,
        requestId: req.id,
        ip,
        method,
        path,
        user,
        userAgent,
        headers: {
            contentType: req.get("content-type") || "none",
            contentLength: req.get("content-length") || 0
        }
    };

    // Log inicial da requisição
    logger.debug(reqLog, `[INCOMING] ${method} ${path} from ${ip} (user: ${user})`);

    // Captura a função original de envio de resposta
    const originalJson = res.json;
    const originalSend = res.send;

    let responseBody = null;

    // Intercepta res.json
    res.json = function (body) {
        responseBody = body;
        return originalJson.call(this, body);
    };

    // Intercepta res.send
    res.send = function (body) {
        responseBody = body;
        return originalSend.call(this, body);
    };

    // Hook para quando a resposta for enviada
    res.on("finish", () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const statusMessage = getStatusMessage(statusCode);

        // Determine o nível de log baseado no status code
        const logLevel = statusCode < 400 ? "info" : statusCode < 500 ? "warn" : "error";
        const logMethod = logger[logLevel] ? logger[logLevel].bind(logger) : logger.info.bind(logger);

        const resLog = {
            timestamp: new Date().toLocaleTimeString("pt-BR", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }),
            requestId: req.id,
            method,
            path,
            statusCode,
            statusMessage,
            duration: `${duration}ms`,
            contentLength: res.get("content-length") || "0",
            user,
            error: responseBody?.error ? true : false
        };

        const durationColor = getDurationColor(duration);
        const statusColor = getStatusColor(statusCode);

        logMethod(resLog,
            `[RESPONSE] ${method} ${path} -> ${statusColor}${statusCode}${statusMessage}${getResetColor()} in ${durationColor}${duration}ms${getResetColor()} (${user})`
        );
    });

    next();
}

/**
 * Retorna mensagem descritiva para status HTTP
 */
function getStatusMessage(code) {
    const messages = {
        200: " OK",
        201: " Created",
        204: " No Content",
        301: " Moved",
        302: " Found",
        304: " Not Modified",
        400: " Bad Request",
        401: " Unauthorized",
        403: " Forbidden",
        404: " Not Found",
        409: " Conflict",
        429: " Too Many Requests",
        500: " Server Error",
        502: " Bad Gateway",
        503: " Service Unavailable"
    };
    return messages[code] || "";
}

/**
 * Retorna cor ANSI para status HTTP
 */
function getStatusColor(statusCode) {
    if (statusCode < 300) return "\x1b[32m"; // verde - sucesso
    if (statusCode < 400) return "\x1b[36m"; // cyan - redirecionamento
    if (statusCode < 500) return "\x1b[33m"; // amarelo - erro cliente
    return "\x1b[31m"; // vermelho - erro servidor
}

/**
 * Retorna cor ANSI para duração da requisição
 */
function getDurationColor(ms) {
    if (ms < 100) return "\x1b[32m"; // verde - rápido
    if (ms < 500) return "\x1b[36m"; // cyan - normal
    if (ms < 2000) return "\x1b[33m"; // amarelo - lento
    return "\x1b[31m"; // vermelho - muito lento
}

/**
 * Retorna código de reset de cor ANSI
 */
function getResetColor() {
    return "\x1b[0m";
}
