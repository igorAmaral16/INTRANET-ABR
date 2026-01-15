import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

function inferRole(decoded) {
    // Compatibilidade e inferência defensiva
    if (decoded?.role) return decoded.role;
    if (decoded?.username || decoded?.nivel) return "ADMIN";
    if (decoded?.matricula) return "COLAB";
    return undefined;
}

function normalizeRole(role) {
    return String(role || "").trim().toUpperCase();
}

export function authJwt(req, res, next) {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
        return res.status(401).json({
            error: { message: "Não autenticado.", requestId: req.id }
        });
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET, {
            algorithms: ["HS256"],
            issuer: env.JWT_ISSUER,
            audience: env.JWT_AUDIENCE
        });

        const role = normalizeRole(inferRole(decoded));

        if (!role) {
            return res.status(401).json({
                error: { message: "Token inválido (role ausente).", requestId: req.id }
            });
        }

        req.user = {
            id: decoded.sub,
            role,
            username: decoded.username,
            matricula: decoded.matricula ? String(decoded.matricula).trim().toUpperCase() : undefined,
            nivel: decoded.nivel,
            jti: decoded.jti
        };

        return next();
    } catch (err) {
        req.log?.warn({ err }, "Invalid JWT");
        return res.status(401).json({
            error: { message: "Token inválido ou expirado.", requestId: req.id }
        });
    }
}
