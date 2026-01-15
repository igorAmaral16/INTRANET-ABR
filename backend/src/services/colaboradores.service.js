import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { buildColaboradorDefaultPassword, normalizeMatricula } from "./auth.service.js";

export async function listColaboradores({ status, search, page, pageSize }) {
    const where = [];
    const params = {};

    if (status) {
        where.push("status = :status");
        params.status = status;
    }

    if (search) {
        where.push("(matricula LIKE :s OR nome_completo LIKE :s2)");
        params.s = `${search}%`;
        params.s2 = `%${search}%`;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM Colaboradores ${whereSql}`,
        params
    );

    const total = Number(countRows?.[0]?.total || 0);

    const [rows] = await pool.query(
        `SELECT matricula, nome_completo, DATE_FORMAT(data_nascimento, '%d/%m/%Y') AS data_nascimento,
            status, created_at, updated_at
     FROM Colaboradores
     ${whereSql}
     ORDER BY nome_completo ASC
     LIMIT :limit OFFSET :offset`,
        { ...params, limit, offset }
    );

    return { total, page, pageSize, items: rows };
}

export async function getColaboradorByMatricula(matriculaRaw) {
    const matricula = normalizeMatricula(matriculaRaw);

    const [rows] = await pool.query(
        `SELECT id, matricula, nome_completo,
            DATE_FORMAT(data_nascimento, '%d/%m/%Y') AS data_nascimento,
            status, created_at, updated_at
     FROM Colaboradores
     WHERE UPPER(TRIM(matricula)) = :matricula
     LIMIT 1`,
        { matricula }
    );
    return rows?.[0] || null;
}

export async function createColaborador({
    matricula,
    nome_completo,
    data_nascimento_ymd,
    status,
    adminId
}) {
    const matriculaNorm = normalizeMatricula(matricula);

    const defaultPassword = buildColaboradorDefaultPassword(matriculaNorm);
    const password_hash = await bcrypt.hash(defaultPassword, 12);

    await pool.query(
        `INSERT INTO Colaboradores
      (matricula, nome_completo, data_nascimento, status, password_hash, must_change_password,
       created_by_admin_id, updated_by_admin_id)
     VALUES
      (:matricula, :nome_completo, :data_nascimento, :status, :password_hash, 1, :adminId, :adminId)`,
        {
            matricula: matriculaNorm,
            nome_completo,
            data_nascimento: data_nascimento_ymd,
            status,
            password_hash,
            adminId
        }
    );

    return getColaboradorByMatricula(matriculaNorm);
}

export async function updateColaboradorByMatricula({
    matricula,
    nome_completo,
    data_nascimento_ymd,
    status,
    adminId
}) {
    const matriculaNorm = normalizeMatricula(matricula);

    const [result] = await pool.query(
        `UPDATE Colaboradores
     SET nome_completo = :nome_completo,
         data_nascimento = :data_nascimento,
         status = :status,
         updated_by_admin_id = :adminId
     WHERE UPPER(TRIM(matricula)) = :matricula`,
        {
            matricula: matriculaNorm,
            nome_completo,
            data_nascimento: data_nascimento_ymd,
            status,
            adminId
        }
    );

    if (result.affectedRows === 0) return null;
    return getColaboradorByMatricula(matriculaNorm);
}

export async function deleteColaboradorByMatricula(matriculaRaw) {
    const matricula = normalizeMatricula(matriculaRaw);

    const [result] = await pool.query(
        `DELETE FROM Colaboradores WHERE UPPER(TRIM(matricula)) = :matricula`,
        { matricula }
    );
    return result.affectedRows > 0;
}
