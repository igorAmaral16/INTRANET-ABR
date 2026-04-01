import { logger } from "../utils/logger.js";

export function notFound(req, res) {
    const timestamp = new Date().toLocaleTimeString("pt-BR", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    const user = req.user?.username || req.user?.id || "anonymous";
    const ip = req.ip || req.connection.remoteAddress || "unknown";

    logger.warn({
        timestamp,
        requestId: req.id,
        method: req.method,
        path: req.path,
        user,
        ip,
        cause: "Route Not Found"
    }, `[${timestamp}] NOT FOUND: ${req.method} ${req.path} from ${ip} (user: ${user})`);

    res.status(404).json({
        error: {
            message: "Esta rota nao foi encontrada.",
            requestId: req.id,
            path: req.path,
            method: req.method
        }
    });
}
