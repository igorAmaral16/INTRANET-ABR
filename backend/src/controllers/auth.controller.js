import { z } from "zod";
import { pool } from "../config/db.js";
import {
    findAdminByUsername,
    verifyPassword,
    issueJwtAdmin,
    markAdminLastLogin,
    findColaboradorByMatricula,
    issueJwtColaborador,
    markColaboradorLastLogin,
    normalizeMatricula
} from "../services/auth.service.js";

const AdminLoginSchema = z.object({
    username: z.string().min(1).max(50),
    password: z.string().min(1).max(200)
});

const ColabLoginSchema = z.object({
    matricula: z.string().min(1).max(30),
    password: z.string().min(1).max(200)
});

export async function loginAdmin(req, res) {
    const body = AdminLoginSchema.parse(req.body);

    const admin = await findAdminByUsername(body.username);

    if (!admin || !admin.ativo) {
        return res.status(401).json({
            error: { message: "Credenciais inválidas.", requestId: req.id }
        });
    }

    const ok = await verifyPassword(body.password, admin.password_hash);
    if (!ok) {
        return res.status(401).json({
            error: { message: "Credenciais inválidas.", requestId: req.id }
        });
    }

    await markAdminLastLogin(admin.id);

    const token = issueJwtAdmin(admin);

    return res.json({
        token,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
        role: "ADMIN",
        user: { id: admin.id, username: admin.username, nome: admin.nome, nivel: admin.nivel }
    });
}

/* =========================
   COLAB: perfil do próprio usuário
========================= */
export async function perfilColaborador(req, res) {
    // compatível com authJwt que expõe "id" (e também com payload padrão "sub")
    const rawId = req.user?.sub ?? req.user?.id;

    const colabId = Number(rawId);
    if (!Number.isFinite(colabId) || colabId <= 0) {
        return res.status(401).json({
            error: { message: "Token inválido.", requestId: req.id }
        });
    }

    const [rows] = await pool.query(
        `SELECT id, matricula, nome_completo,
            DATE_FORMAT(data_nascimento, '%d/%m/%Y') AS data_nascimento,
            status
     FROM Colaboradores
     WHERE id = :id
     LIMIT 1`,
        { id: colabId }
    );

    const colab = rows?.[0];

    if (!colab) {
        return res.status(404).json({
            error: { message: "Colaborador não encontrado.", requestId: req.id }
        });
    }

    return res.json({
        user: {
            id: colab.id,
            matricula: normalizeMatricula(colab.matricula),
            nome_completo: colab.nome_completo,
            data_nascimento: colab.data_nascimento,
            status: colab.status
        }
    });
}

export async function loginColaborador(req, res) {
    const body = ColabLoginSchema.parse(req.body);
    const matricula = normalizeMatricula(body.matricula);

    const colab = await findColaboradorByMatricula(matricula);

    if (!colab || colab.status !== "ATIVO" || !colab.password_hash) {
        return res.status(401).json({
            error: { message: "Credenciais inválidas.", requestId: req.id }
        });
    }

    const ok = await verifyPassword(body.password, colab.password_hash);
    if (!ok) {
        return res.status(401).json({
            error: { message: "Credenciais inválidas.", requestId: req.id }
        });
    }

    await markColaboradorLastLogin(colab.id);

    const token = issueJwtColaborador(colab);

    return res.json({
        token,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
        role: "COLAB",
        user: {
            id: colab.id,
            matricula: normalizeMatricula(colab.matricula),
            mustChangePassword: Boolean(colab.must_change_password)
        }
    });
}

export async function me(req, res) {
    res.json({ user: req.user });
}
