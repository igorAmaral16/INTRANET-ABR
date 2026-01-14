import { isProd } from "../config/env.js";
import { ZodError } from "zod";

export function errorHandler(err, req, res, next) {
    if (err instanceof ZodError) {
        req.log?.warn({ issues: err.issues }, "Validation failed");
        return res.status(400).json({
            error: {
                message: "Campos inválidos.",
                requestId: req.id,
                fields: err.issues.map((i) => ({
                    path: i.path.join("."),
                    message: i.message
                }))
            }
        });
    }

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

    if (!isProd) {
        payload.error.stack = err.stack;
    }

    res.status(statusCode).json(payload);
}
