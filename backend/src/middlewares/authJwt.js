import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function authJwt(req, res, next) {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
        return res.status(401).json({ error: { message: "Não autenticado.", requestId: req.id } });
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET, {
            algorithms: ["HS256"],
            issuer: env.JWT_ISSUER,
            audience: env.JWT_AUDIENCE
        });

        req.user = {
            id: decoded.sub,
            username: decoded.username,
            nivel: decoded.nivel,
            jti: decoded.jti
        };

        return next();
    } catch (err) {
        req.log?.warn({ err }, "Invalid JWT");
        return res.status(401).json({ error: { message: "Token inválido ou expirado.", requestId: req.id } });
    }
}
