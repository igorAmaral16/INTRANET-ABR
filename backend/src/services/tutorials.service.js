import { pool } from "../config/db.js";

export async function createTutorial(data) {
    const {
        setor,
        titulo,
        descricao,
        data_publicacao,
        url,
        publicado_por_admin_id,
        publicado_por_nome
    } = data;

    const [result] = await pool.query(
        `INSERT INTO Tutoriais
         (setor, titulo, descricao, data_publicacao, url, publicado_por_admin_id, publicado_por_nome)
         VALUES
         (:setor, :titulo, :descricao, :data_publicacao, :url, :publicado_por_admin_id, :publicado_por_nome)`,
        {
            setor,
            titulo,
            descricao,
            data_publicacao,
            url,
            publicado_por_admin_id,
            publicado_por_nome
        }
    );

    return getTutorialById(result.insertId);
}

export async function getTutorialById(id) {
    const [rows] = await pool.query(
        `SELECT id, setor, titulo, descricao,
                DATE_FORMAT(data_publicacao, '%d/%m/%Y') AS data_publicacao,
                url, publicado_por_nome, created_at, updated_at
         FROM Tutoriais
         WHERE id = :id
         LIMIT 1`,
        { id }
    );
    return rows?.[0] || null;
}

export async function listPublicTutorials({ setor }) {
    const [rows] = await pool.query(
        `SELECT id, setor, titulo, descricao,
                DATE_FORMAT(data_publicacao, '%d/%m/%Y') AS data_publicacao,
                url
         FROM Tutoriais
         WHERE setor = :setor
         ORDER BY data_publicacao DESC`,
        { setor }
    );
    return rows || [];
}

export async function listAdminTutorials({ setor }) {
    const where = setor ? "WHERE setor = :setor" : "";
    const params = setor ? { setor } : {};

    const [rows] = await pool.query(
        `SELECT id, setor, titulo, descricao,
                DATE_FORMAT(data_publicacao, '%d/%m/%Y') AS data_publicacao,
                url, publicado_por_nome
         FROM Tutoriais
         ${where}
         ORDER BY data_publicacao DESC`,
        params
    );
    return rows || [];
}

export async function deleteTutorial(id) {
    const [result] = await pool.query(
        `DELETE FROM Tutoriais WHERE id = :id`,
        { id }
    );
    return result.affectedRows > 0;
}

export async function updateTutorial(id, data) {
    const {
        setor,
        titulo,
        descricao,
        data_publicacao,
        url,
        publicado_por_admin_id,
        publicado_por_nome
    } = data;

    const [result] = await pool.query(
        `UPDATE Tutoriais
         SET setor = :setor,
             titulo = :titulo,
             descricao = :descricao,
             data_publicacao = :data_publicacao,
             url = :url,
             publicado_por_admin_id = :publicado_por_admin_id,
             publicado_por_nome = :publicado_por_nome
         WHERE id = :id`,
        {
            id,
            setor,
            titulo,
            descricao,
            data_publicacao,
            url,
            publicado_por_admin_id,
            publicado_por_nome
        }
    );

    if (result.affectedRows === 0) return null;
    return getTutorialById(id);
}