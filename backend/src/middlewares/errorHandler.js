import { isProd } from "../config/env.js";
import { ZodError } from "zod";
import { logger } from "../utils/logger.js";

export function errorHandler(err, req, res, next) {
    const timestamp = new Date().toLocaleTimeString("pt-BR", { 
        hour12: false,
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit" 
    });

    // Erros de validação Zod
    if (err instanceof ZodError) {
        const fieldErrors = err.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message
        }));

        logger.warn({
            timestamp,
            requestId: req.id,
            method: req.method,
            path: req.path,
            user: req.user?.username || req.user?.id || "anonymous",
            issues: fieldErrors,
            cause: "Validation Failed"
        }, `[${timestamp}] VALIDATION ERROR: ${req.method} ${req.path} - ${fieldErrors.map(f => `${f.path} (${f.message})`).join("; ")}`);

        return res.status(400).json({
            error: {
                message: "Dados inválidos. Verifique os campos abaixo.",
                requestId: req.id,
                fields: fieldErrors
            }
        });
    }

    const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;
    const errorMessage = err.message || "Unknown error";
    const stack = err.stack;

    // Prepara contexto do erro
    const errorContext = {
        timestamp,
        requestId: req.id,
        statusCode,
        method: req.method,
        path: req.path,
        user: req.user?.username || req.user?.id || "anonymous",
        ip: req.ip || req.connection.remoteAddress || "unknown",
        message: errorMessage,
        cause: err.name || "Error"
    };

    // Log de erro com detalhes
    if (statusCode >= 500) {
        logger.error(
            {
                ...errorContext,
                stack,
                queryParams: req.query,
                bodySize: JSON.stringify(req.body).length
            },
            `[${timestamp}] SERVER ERROR: ${req.method} ${req.path} [${statusCode}] - ${errorMessage}`
        );
    } else if (statusCode >= 400) {
        logger.warn(
            errorContext,
            `[${timestamp}] CLIENT ERROR: ${req.method} ${req.path} [${statusCode}] - ${errorMessage}`
        );
    } else {
        logger.info(
            errorContext,
            `[${timestamp}] HTTP ERROR: ${req.method} ${req.path} [${statusCode}] - ${errorMessage}`
        );
    }

    // Resposta ao cliente
    const payload = {
        error: {
            message:
                statusCode >= 500
                    ? "Erro interno no servidor. Por favor, tente novamente mais tarde ou contate o suporte."
                    : (errorMessage || "Requisição inválida."),
            requestId: req.id,
            code: err.code || `HTTP_${statusCode}`
        }
    };

    // Em desenvolvimento, inclui stack trace
    if (!isProd) {
        payload.error.stack = stack;
        payload.error.details = {
            method: req.method,
            path: req.path,
            timestamp
        };
    }

    res.status(statusCode).json(payload);
}
