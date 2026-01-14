import { pool } from "../config/db.js";

export async function createComunicado(data) {
    const {
        titulo,
        descricao,
        importancia,
        fixado_topo,
        status,
        expira_em,
        anexo_url,
        anexo_tipo,
        publicado_por_admin_id,
        publicado_por_nome
    } = data;

    const [result] = await pool.query(
        `INSERT INTO Comunicados
      (titulo, descricao, importancia, fixado_topo, status, expira_em,
       anexo_url, anexo_tipo, publicado_por_admin_id, publicado_por_nome)
     VALUES
      (:titulo, :descricao, :importancia, :fixado_topo, :status, :expira_em,
       :anexo_url, :anexo_tipo, :publicado_por_admin_id, :publicado_por_nome)`,
        {
            titulo,
            descricao,
            importancia,
            fixado_topo,
            status,
            expira_em,
            anexo_url,
            anexo_tipo,
            publicado_por_admin_id,
            publicado_por_nome
        }
    );

    return getComunicadoById(result.insertId, { includeRascunho: true });
}

export async function updateComunicado(id, data) {
    const {
        titulo,
        descricao,
        importancia,
        fixado_topo,
        status,
        expira_em,
        anexo_url,
        anexo_tipo,
        publicado_por_admin_id,
        publicado_por_nome
    } = data;

    const [result] = await pool.query(
        `UPDATE Comunicados
     SET titulo = :titulo,
         descricao = :descricao,
         importancia = :importancia,
         fixado_topo = :fixado_topo,
         status = :status,
         expira_em = :expira_em,
         anexo_url = :anexo_url,
         anexo_tipo = :anexo_tipo,
         publicado_por_admin_id = :publicado_por_admin_id,
         publicado_por_nome = :publicado_por_nome
     WHERE id = :id`,
        {
            id,
            titulo,
            descricao,
            importancia,
            fixado_topo,
            status,
            expira_em,
            anexo_url,
            anexo_tipo,
            publicado_por_admin_id,
            publicado_por_nome
        }
    );

    if (result.affectedRows === 0) return null;
    return getComunicadoById(id, { includeRascunho: true });
}

export async function deleteComunicado(id) {
    const [result] = await pool.query(
        `DELETE FROM Comunicados WHERE id = :id`,
        { id }
    );
    return result.affectedRows > 0;
}

export async function getComunicadoById(id, { includeRascunho } = { includeRascunho: false }) {
    const where = includeRascunho ? "id = :id" : "id = :id AND status = 'PUBLICADO' AND (expira_em IS NULL OR expira_em >= CURDATE())";

    const [rows] = await pool.query(
        `SELECT id, titulo, descricao, importancia, fixado_topo, status,
            DATE_FORMAT(expira_em, '%d/%m/%Y') AS expira_em,
            anexo_url, anexo_tipo, publicado_por_nome, created_at, updated_at
     FROM Comunicados
     WHERE ${where}
     LIMIT 1`,
        { id }
    );
    return rows?.[0] || null;
}

export async function listPublicComunicados({ page, pageSize }) {
    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total
     FROM Comunicados
     WHERE status = 'PUBLICADO'
       AND expira_em >= CURDATE()`
    );

    const total = Number(countRows?.[0]?.total || 0);

    const [rows] = await pool.query(
        `SELECT id, titulo, importancia, fixado_topo,
            DATE_FORMAT(expira_em, '%d/%m/%Y') AS expira_em,
            anexo_url, anexo_tipo, publicado_por_nome, created_at, updated_at
     FROM Comunicados
     WHERE status = 'PUBLICADO'
       AND expira_em >= CURDATE()
     ORDER BY fixado_topo DESC, created_at DESC
     LIMIT :limit OFFSET :offset`,
        { limit, offset }
    );

    return { total, page, pageSize, items: rows };
}

export async function listAdminComunicados({ status, page, pageSize }) {
    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    const where = status ? "WHERE status = :status" : "";
    const params = status ? { status, limit, offset } : { limit, offset };

    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM Comunicados ${where}`,
        status ? { status } : {}
    );

    const total = Number(countRows?.[0]?.total || 0);

    const [rows] = await pool.query(
        `SELECT id, titulo, importancia, fixado_topo, status,
            DATE_FORMAT(expira_em, '%d/%m/%Y') AS expira_em,
            anexo_url, anexo_tipo, publicado_por_nome, created_at, updated_at
     FROM Comunicados
     ${where}
     ORDER BY updated_at DESC
     LIMIT :limit OFFSET :offset`,
        params
    );

    return { total, page, pageSize, items: rows };
}
