import { Server } from "socket.io";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";
import jwt from "jsonwebtoken";

let io;

const ROLE_ALIASES = {
    ADMIN: new Set(["ADMIN", "ADMINISTRACAO", "ADMINISTRATIVO"]),
    COLAB: new Set(["COLAB", "COLABORADOR", "COLABORADORES"]),
};

function normalizeRole(roleRaw) {
    const r = String(roleRaw || "").toUpperCase();
    if (ROLE_ALIASES.ADMIN.has(r)) return "ADMIN";
    if (ROLE_ALIASES.COLAB.has(r)) return "COLAB";
    return null;
}

/**
 * Autenticação do socket:
 * - cliente manda token no auth: { token: "..." }
 * - validamos como no authJwt (issuer/audience/alg HS256)
 * - colocamos o socket em rooms padronizadas:
 *   - role:ADMIN | role:COLAB
 *   - admin:<id> | colab:<id>
 */
export function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: env.CORS_ORIGIN || true,
            credentials: true,
        },
    });

    io.use((socket, next) => {
        try {
            const token = socket.handshake?.auth?.token;
            if (!token) return next(new Error("NO_TOKEN"));

            // Mesma validação do authJwt (padroniza a autenticação)
            const decoded = jwt.verify(token, env.JWT_SECRET, {
                algorithms: ["HS256"],
                issuer: env.JWT_ISSUER,
                audience: env.JWT_AUDIENCE,
            });

            // No seu authJwt o id vem em decoded.sub
            const idNum = Number(decoded?.sub ?? decoded?.id);
            const role = normalizeRole(decoded?.role);

            if (!Number.isFinite(idNum) || !role) {
                return next(new Error("INVALID_TOKEN"));
            }

            const user = {
                id: idNum,
                role, // "ADMIN" | "COLAB"
                nivel: Number(decoded?.nivel || 0),
                matricula: decoded?.matricula || null,
                nome: decoded?.nome_completo || decoded?.username || null,
            };

            socket.user = user;

            // Rooms padrão (padronizadas e estáveis)
            socket.join(`role:${user.role}`);
            socket.join(`${user.role === "ADMIN" ? "admin" : "colab"}:${user.id}`);

            next();
        } catch (err) {
            return next(new Error("INVALID_TOKEN"));
        }
    });

    io.on("connection", (socket) => {
        logger.info({ user: socket.user, sid: socket.id }, "socket connected");

        socket.on("rh:join", (conversationId) => {
            if (!conversationId) return;
            socket.join(`rh:${conversationId}`);
        });

        socket.on("rh:leave", (conversationId) => {
            if (!conversationId) return;
            socket.leave(`rh:${conversationId}`);
        });

        socket.on("disconnect", (reason) => {
            logger.info({ user: socket.user, sid: socket.id, reason }, "socket disconnected");
        });
    });

    return io;
}

export function getIo() {
    if (!io) throw new Error("Socket.io não inicializado");
    return io;
}
