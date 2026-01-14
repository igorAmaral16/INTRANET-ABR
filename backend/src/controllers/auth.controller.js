import { z } from "zod";
import {
    findAdminByUsername,
    verifyPassword,
    issueJwt,
    markLastLogin
} from "../services/auth.service.js";

const LoginSchema = z.object({
    username: z.string().min(1).max(50),
    password: z.string().min(1).max(200)
});

export async function login(req, res) {
    const body = LoginSchema.parse(req.body);

    const admin = await findAdminByUsername(body.username);

    // Resposta uniforme (não revelar se usuário existe)
    if (!admin || !admin.ativo) {
        return res.status(401).json({ error: { message: "Credenciais inválidas.", requestId: req.id } });
    }

    const ok = await verifyPassword(body.password, admin.password_hash);
    if (!ok) {
        return res.status(401).json({ error: { message: "Credenciais inválidas.", requestId: req.id } });
    }

    await markLastLogin(admin.id);

    const token = issueJwt(admin);

    return res.json({
        token,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
        user: { id: admin.id, username: admin.username, nome: admin.nome, nivel: admin.nivel }
    });
}

export async function me(req, res) {
    // req.user vem do middleware authJwt
    res.json({ user: req.user });
}
