import { isProd } from "../config/env.js";

export function errorHandler(err, req, res, next) {
    const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;

    req.log?.error({ err, statusCode }, "Request failed");

    const payload = {
        error: {
            message:
                statusCode >= 500
                    ? "Erro interno. Tente novamente mais tarde."
                    : (err.message || "Requisição inválida."),
            requestId: req.id
        }
    };

    if (!isProd) payload.error.stack = err.stack;

    res.status(statusCode).json(payload);
}
