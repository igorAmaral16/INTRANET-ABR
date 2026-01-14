import { z } from "zod";
import {
    findAdminByUsername,
    verifyPassword,
    issueJwtAdmin,
    markAdminLastLogin,
    findColaboradorByMatricula,
    issueJwtColaborador,
    markColaboradorLastLogin
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

export async function loginColaborador(req, res) {
    const body = ColabLoginSchema.parse(req.body);

    const colab = await findColaboradorByMatricula(body.matricula);

    // Só permite login se existir, tiver senha cadastrada e status ATIVO
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
            matricula: colab.matricula,
            mustChangePassword: Boolean(colab.must_change_password)
        }
    });
}

export async function me(req, res) {
    res.json({ user: req.user });
}
