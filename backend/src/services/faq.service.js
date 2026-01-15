import { pool } from "../config/db.js";

export async function listFaqPublic() {
    const [rows] = await pool.query(
        `SELECT id, titulo, categoria, descricao, ordem, updated_at
     FROM FaqItens
     WHERE ativo = 1
     ORDER BY ordem DESC, categoria ASC, titulo ASC`
    );
    return rows;
}

export async function listFaqAdmin() {
    const [rows] = await pool.query(
        `SELECT id, titulo, categoria, descricao, ativo, ordem, created_at, updated_at
     FROM FaqItens
     ORDER BY ativo DESC, ordem DESC, categoria ASC, titulo ASC`
    );
    return rows;
}

export async function getFaqById(id) {
    const [rows] = await pool.query(
        `SELECT id, titulo, categoria, descricao, ativo, ordem, created_at, updated_at
     FROM FaqItens
     WHERE id = :id
     LIMIT 1`,
        { id }
    );
    return rows?.[0] || null;
}

export async function createFaq({ titulo, categoria, descricao, ativo, ordem, adminId }) {
    const [result] = await pool.query(
        `INSERT INTO FaqItens
      (titulo, categoria, descricao, ativo, ordem, created_by_admin_id, updated_by_admin_id)
     VALUES
      (:titulo, :categoria, :descricao, :ativo, :ordem, :adminId, :adminId)`,
        { titulo, categoria, descricao, ativo, ordem, adminId }
    );

    return getFaqById(result.insertId);
}

export async function updateFaq(id, { titulo, categoria, descricao, ativo, ordem, adminId }) {
    const [result] = await pool.query(
        `UPDATE FaqItens
     SET titulo = :titulo,
         categoria = :categoria,
         descricao = :descricao,
         ativo = :ativo,
         ordem = :ordem,
         updated_by_admin_id = :adminId
     WHERE id = :id`,
        { id, titulo, categoria, descricao, ativo, ordem, adminId }
    );

    if (result.affectedRows === 0) return null;
    return getFaqById(id);
}

export async function deleteFaq(id) {
    const [result] = await pool.query(
        `DELETE FROM FaqItens WHERE id = :id`,
        { id }
    );
    return result.affectedRows > 0;
}
