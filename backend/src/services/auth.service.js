import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";

export async function findAdminByUsername(username) {
    const [rows] = await pool.query(
        `SELECT id, username, nome, nivel, password_hash, ativo
     FROM Administracao
     WHERE username = :username
     LIMIT 1`,
        { username }
    );
    return rows?.[0] || null;
}

export async function markLastLogin(adminId) {
    await pool.query(
        `UPDATE Administracao SET last_login_at = NOW() WHERE id = :id`,
        { id: adminId }
    );
}

export async function verifyPassword(plainPassword, passwordHash) {
    return bcrypt.compare(plainPassword, passwordHash);
}

export function issueJwt(admin) {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
        sub: String(admin.id),
        username: admin.username,
        nivel: admin.nivel,
        jti: randomUUID(),
        iat: now
    };

    return jwt.sign(payload, env.JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: env.JWT_EXPIRES_IN,
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE
    });
}
