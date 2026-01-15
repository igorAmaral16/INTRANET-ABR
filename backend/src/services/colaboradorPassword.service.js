import { pool } from "../config/db.js";
import { verifyPassword, hashPassword, normalizeMatricula } from "./auth.service.js";

export async function changePassword({ colaboradorId, currentPassword, newPassword }) {
    const [rows] = await pool.query(
        `SELECT id, matricula, password_hash
     FROM Colaboradores
     WHERE id = :id
     LIMIT 1`,
        { id: colaboradorId }
    );

    const colab = rows?.[0];
    if (!colab || !colab.password_hash) {
        const e = new Error("Conta não encontrada.");
        e.statusCode = 404;
        throw e;
    }

    const ok = await verifyPassword(currentPassword, colab.password_hash);
    if (!ok) {
        const e = new Error("Senha atual inválida.");
        e.statusCode = 401;
        throw e;
    }

    // Regras mínimas (ajuste depois se quiser mais forte)
    if (typeof newPassword !== "string" || newPassword.length < 6 || newPassword.length > 200) {
        const e = new Error("Nova senha inválida (mínimo 6 caracteres).");
        e.statusCode = 400;
        throw e;
    }

    // Bloqueia repetir a senha padrão por segurança operacional
    const matricula = normalizeMatricula(colab.matricula);
    const defaultCandidate = `${matricula}_${matricula.slice(0, 2)}`;
    if (newPassword === defaultCandidate) {
        const e = new Error("Nova senha não pode ser a senha padrão.");
        e.statusCode = 400;
        throw e;
    }

    const newHash = await hashPassword(newPassword);

    await pool.query(
        `UPDATE Colaboradores
     SET password_hash = :hash,
         must_change_password = 0
     WHERE id = :id`,
        { id: colaboradorId, hash: newHash }
    );

    return true;
}
