import { pool } from "../config/db.js";

export async function listPublicCarouselItems() {
    const [rows] = await pool.query(
        `SELECT id, titulo, imagem_url, publicado_em
     FROM Carrossel
     WHERE status = 'PUBLICADO'
     AND (eh_evento IS NULL OR eh_evento = false)
     ORDER BY publicado_em DESC`);
    return rows || [];
}

export async function listPublicEventos() {
    const [rows] = await pool.query(
        `SELECT id, titulo, conteudo, imagem_url, foto_perfil, publicado_em
     FROM Carrossel
     WHERE status = 'PUBLICADO'
     AND eh_evento = true
     ORDER BY publicado_em DESC`);
    return rows || [];
}

export async function getCarouselItemById(id) {
    const [rows] = await pool.query(
        `SELECT id, titulo, conteudo, imagem_url, status,
            publicado_por_admin_id, publicado_por_nome, publicado_em,
            eh_evento, foto_perfil,
            created_at, updated_at
     FROM Carrossel
     WHERE id = :id
     LIMIT 1`,
        { id }
    );
    return rows?.[0] || null;
}

// admin helpers
export async function listAdminCarouselItems() {
    const [rows] = await pool.query(
        `SELECT id, titulo, status, publicado_em, eh_evento, foto_perfil, created_at, updated_at
     FROM Carrossel
     ORDER BY updated_at DESC`);
    return rows || [];
}

export async function createCarouselItem(data) {
    const {
        titulo,
        conteudo,
        imagem_url,
        status,
        publicado_por_admin_id,
        publicado_por_nome,
        publicado_em,
        eh_evento,
        foto_perfil,
    } = data;

    const [result] = await pool.query(
        `INSERT INTO Carrossel
      (titulo, conteudo, imagem_url, status, publicado_por_admin_id, publicado_por_nome, publicado_em, eh_evento, foto_perfil)
     VALUES
      (:titulo, :conteudo, :imagem_url, :status, :publicado_por_admin_id, :publicado_por_nome, :publicado_em, :eh_evento, :foto_perfil)`,
        {
            titulo,
            conteudo,
            imagem_url,
            status,
            publicado_por_admin_id,
            publicado_por_nome,
            publicado_em,
            eh_evento: eh_evento || false,
            foto_perfil: foto_perfil || null,
        }
    );

    return getCarouselItemById(result.insertId);
}

export async function updateCarouselItem(id, data) {
    const {
        titulo,
        conteudo,
        imagem_url,
        status,
        publicado_por_admin_id,
        publicado_por_nome,
        publicado_em,
        eh_evento,
        foto_perfil,
    } = data;

    const [result] = await pool.query(
        `UPDATE Carrossel
     SET titulo = :titulo,
         conteudo = :conteudo,
         imagem_url = :imagem_url,
         status = :status,
         publicado_por_admin_id = :publicado_por_admin_id,
         publicado_por_nome = :publicado_por_nome,
         publicado_em = :publicado_em,
         eh_evento = :eh_evento,
         foto_perfil = :foto_perfil
     WHERE id = :id`,
        {
            id,
            titulo,
            conteudo,
            imagem_url,
            status,
            publicado_por_admin_id,
            publicado_por_nome,
            publicado_em,
            eh_evento: eh_evento || false,
            foto_perfil: foto_perfil || null,
        }
    );

    if (result.affectedRows === 0) return null;
    return getCarouselItemById(id);
}

export async function deleteCarouselItem(id) {
    const [result] = await pool.query(
        `DELETE FROM Carrossel WHERE id = :id`,
        { id }
    );
    return result.affectedRows > 0;
}
