import { pool } from "../config/db.js";

export async function listColaboradores({ status, search, page, pageSize }) {
    const where = [];
    const params = {};

    if (status) {
        where.push("status = :status");
        params.status = status;
    }

    if (search) {
        // Busca simples, defensiva, com prefixo e contains
        where.push("(matricula LIKE :s OR nome_completo LIKE :s2)");
        params.s = `${search}%`;
        params.s2 = `%${search}%`;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total
     FROM Colaboradores
     ${whereSql}`,
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

export async function getColaboradorByMatricula(matricula) {
    const [rows] = await pool.query(
        `SELECT id, matricula, nome_completo,
            DATE_FORMAT(data_nascimento, '%d/%m/%Y') AS data_nascimento,
            status, created_at, updated_at
     FROM Colaboradores
     WHERE matricula = :matricula
     LIMIT 1`,
        { matricula }
    );
    return rows?.[0] || null;
}

export async function createColaborador({ matricula, nome_completo, data_nascimento_ymd, status, adminId }) {
    await pool.query(
        `INSERT INTO Colaboradores
      (matricula, nome_completo, data_nascimento, status, created_by_admin_id, updated_by_admin_id)
     VALUES
      (:matricula, :nome_completo, :data_nascimento, :status, :adminId, :adminId)`,
        {
            matricula,
            nome_completo,
            data_nascimento: data_nascimento_ymd,
            status,
            adminId
        }
    );

    return getColaboradorByMatricula(matricula);
}

export async function updateColaboradorByMatricula({ matricula, nome_completo, data_nascimento_ymd, status, adminId }) {
    const [result] = await pool.query(
        `UPDATE Colaboradores
     SET nome_completo = :nome_completo,
         data_nascimento = :data_nascimento,
         status = :status,
         updated_by_admin_id = :adminId
     WHERE matricula = :matricula`,
        {
            matricula,
            nome_completo,
            data_nascimento: data_nascimento_ymd,
            status,
            adminId
        }
    );

    if (result.affectedRows === 0) return null;
    return getColaboradorByMatricula(matricula);
}

export async function deleteColaboradorByMatricula(matricula) {
    const [result] = await pool.query(
        `DELETE FROM Colaboradores WHERE matricula = :matricula`,
        { matricula }
    );
    return result.affectedRows > 0;
}
