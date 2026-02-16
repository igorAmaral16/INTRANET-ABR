import { pool } from "../config/db.js";

export async function confirmRead({ comunicadoId, colaboradorId }) {
    // Valida: comunicado existe, é PUBLICADO, não expirou e é crítico (IMPORTANTE)
    const [rows] = await pool.query(
        `SELECT id, status, requer_confirmacao, expira_em
     FROM Comunicados
     WHERE id = :id
     LIMIT 1`,
        { id: comunicadoId }
    );

    const c = rows?.[0];
    if (!c) {
        const e = new Error("Comunicado não encontrado.");
        e.statusCode = 404;
        throw e;
    }

    if (c.status !== "PUBLICADO") {
        const e = new Error("Comunicado não está publicado.");
        e.statusCode = 400;
        throw e;
    }

    // expira_em é obrigatório para publicado no seu fluxo atual; mas fica defensivo:
    if (!c.expira_em) {
        const e = new Error("Comunicado sem data de expiração configurada.");
        e.statusCode = 400;
        throw e;
    }

    if (!c.requer_confirmacao) {
        const e = new Error("Confirmação de leitura não é solicitada para este comunicado.");
        e.statusCode = 400;
        throw e;
    }

    // Não expirado: expira_em >= hoje
    const [validRows] = await pool.query(
        `SELECT 1 AS ok
     FROM Comunicados
     WHERE id = :id
       AND expira_em >= CURDATE()
     LIMIT 1`,
        { id: comunicadoId }
    );

    if (!validRows?.[0]) {
        const e = new Error("Comunicado expirado.");
        e.statusCode = 400;
        throw e;
    }

    // Idempotente: se já existir, não duplica
    const [result] = await pool.query(
        `INSERT INTO ComunicadoReadConfirmations (comunicado_id, colaborador_id)
     VALUES (:comunicadoId, :colaboradorId)
     ON DUPLICATE KEY UPDATE confirmed_at = confirmed_at`,
        { comunicadoId, colaboradorId }
    );

    // result.affectedRows em MySQL pode ser 1 (insert) ou 2 (update no duplicate),
    // então retornamos boolean “ok” sempre.
    return true;
}

export async function hasConfirmed({ comunicadoId, colaboradorId }) {
    const [rows] = await pool.query(
        `SELECT 1 AS ok
     FROM ComunicadoReadConfirmations
     WHERE comunicado_id = :comunicadoId
       AND colaborador_id = :colaboradorId
     LIMIT 1`,
        { comunicadoId, colaboradorId }
    );

    return Boolean(rows?.[0]);
}
