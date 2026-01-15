import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { pool } from "../config/db.js";
import { env } from "../config/env.js";

/* =========================
   HELPERS
========================= */

export function normalizeMatricula(m) {
    if (m === null || m === undefined) return "";
    return String(m).trim().toUpperCase();
}

/* =========================
   ADMIN
========================= */

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

export async function markAdminLastLogin(adminId) {
    await pool.query(
        `UPDATE Administracao SET last_login_at = NOW() WHERE id = :id`,
        { id: adminId }
    );
}

/* =========================
   COLABORADOR
========================= */

export function buildColaboradorDefaultPassword(matriculaRaw) {
    const matricula = normalizeMatricula(matriculaRaw);
    const first2 = matricula.slice(0, 2);
    return `${matricula}_${first2}`;
}

export async function findColaboradorByMatricula(matriculaRaw) {
    const matricula = normalizeMatricula(matriculaRaw);

    const [rows] = await pool.query(
        `SELECT id, matricula, nome_completo, status, password_hash, must_change_password
     FROM Colaboradores
     WHERE UPPER(TRIM(matricula)) = :matricula
     LIMIT 1`,
        { matricula }
    );
    return rows?.[0] || null;
}

export async function markColaboradorLastLogin(colabId) {
    await pool.query(
        `UPDATE Colaboradores SET last_login_at = NOW() WHERE id = :id`,
        { id: colabId }
    );
}

/* =========================
   SHARED
========================= */

export async function verifyPassword(plainPassword, passwordHash) {
    return bcrypt.compare(String(plainPassword), String(passwordHash));
}

export async function hashPassword(plainPassword) {
    return bcrypt.hash(String(plainPassword), 12);
}

export function issueJwtAdmin(admin) {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
        sub: String(admin.id),
        role: "ADMIN",
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

export function issueJwtColaborador(colab) {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
        sub: String(colab.id),
        role: "COLAB",
        matricula: normalizeMatricula(colab.matricula),
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
