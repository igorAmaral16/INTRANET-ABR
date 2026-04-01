import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export function authJwt(req, res, next) {
    const timestamp = new Date().toLocaleTimeString("pt-BR", { 
        hour12: false,
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit" 
    });

    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
        logger.warn({
            timestamp,
            requestId: req.id,
            method: req.method,
            path: req.path,
            ip: req.ip,
            cause: "Missing or Invalid Token"
        }, `[${timestamp}] AUTH FAILED: Missing or invalid JWT token for ${req.method} ${req.path}`);

        return res.status(401).json({
            error: { 
                message: "Nao autenticado. Token JWT ausente ou invalido.",
                requestId: req.id,
                code: "MISSING_TOKEN"
            }
        });
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET, {
            algorithms: ["HS256"],
            issuer: env.JWT_ISSUER,
            audience: env.JWT_AUDIENCE
        });

        // Campos mínimos padronizados
        req.user = {
            id: decoded.sub,
            role: decoded.role,
            username: decoded.username,
            nome_completo: decoded.nome_completo,
            matricula: decoded.matricula,
            nivel: decoded.nivel,
            jti: decoded.jti
        };

        logger.debug({
            timestamp,
            requestId: req.id,
            user: req.user.username || req.user.id,
            method: req.method,
            path: req.path
        }, `[${timestamp}] AUTH SUCCESS: User ${req.user.username || req.user.id} authenticated for ${req.method} ${req.path}`);

        return next();
    } catch (err) {
        const errorReason = err.name === "TokenExpiredError" 
            ? "Token expirado" 
            : err.name === "JsonWebTokenError"
            ? "Token invalido"
            : err.message;

        logger.warn({
            timestamp,
            requestId: req.id,
            method: req.method,
            path: req.path,
            ip: req.ip,
            error: err.name,
            cause: errorReason
        }, `[${timestamp}] AUTH FAILED: Invalid JWT for ${req.method} ${req.path} - ${errorReason}`);

        return res.status(401).json({
            error: { 
                message: `Token invalido ou expirado. ${errorReason}`,
                requestId: req.id,
                code: err.name
            }
        });
    }
}
