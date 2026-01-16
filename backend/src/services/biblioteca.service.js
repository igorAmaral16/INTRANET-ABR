import { pool } from "../config/db.js";

export async function createPasta({ nome, slug, adminId }) {
    const [result] = await pool.query(
        `INSERT INTO BibliotecaPastas (nome, slug, created_by_admin_id)
     VALUES (:nome, :slug, :adminId)`,
        { nome, slug, adminId }
    );
    return getPastaById(result.insertId);
}

export async function listPastas() {
    const [rows] = await pool.query(
        `SELECT id, nome, slug, created_at, updated_at
     FROM BibliotecaPastas
     ORDER BY nome ASC`
    );
    return rows;
}

export async function getPastaById(id) {
    const [rows] = await pool.query(
        `SELECT id, nome, slug, created_at, updated_at
     FROM BibliotecaPastas
     WHERE id = :id
     LIMIT 1`,
        { id }
    );
    return rows?.[0] || null;
}

export async function getPastaBySlug(slug) {
    const [rows] = await pool.query(
        `SELECT id, nome, slug, created_at, updated_at
     FROM BibliotecaPastas
     WHERE slug = :slug
     LIMIT 1`,
        { slug }
    );
    return rows?.[0] || null;
}

export async function deletePastaById(id) {
    // ON DELETE CASCADE vai apagar documentos no banco,
    // mas ainda precisamos remover arquivos físicos no endpoint (será feito no controller)
    const [result] = await pool.query(
        `DELETE FROM BibliotecaPastas WHERE id = :id`,
        { id }
    );
    return result.affectedRows > 0;
}

export async function createDocumento({
    pastaId,
    nome,
    slug,
    filePath,
    fileSize,
    fileHash,
    mimeType,
    adminId
}) {
    const [result] = await pool.query(
        `INSERT INTO BibliotecaDocumentos
      (pasta_id, nome, slug, file_path, file_size, file_hash, mime_type, created_by_admin_id)
     VALUES
      (:pastaId, :nome, :slug, :filePath, :fileSize, :fileHash, :mimeType, :adminId)`,
        {
            pastaId,
            nome,
            slug,
            filePath,
            fileSize,
            fileHash,
            mimeType,
            adminId
        }
    );
    return getDocumentoById(result.insertId);
}

export async function listDocumentosByPasta(pastaId) {
    const [rows] = await pool.query(
        `SELECT id, pasta_id, nome, slug, file_size, created_at, updated_at
     FROM BibliotecaDocumentos
     WHERE pasta_id = :pastaId
     ORDER BY nome ASC`,
        { pastaId }
    );
    return rows;
}

export async function getDocumentoById(id) {
    const [rows] = await pool.query(
        `SELECT id, pasta_id, nome, slug, file_path, file_size, mime_type, created_at, updated_at
     FROM BibliotecaDocumentos
     WHERE id = :id
     LIMIT 1`,
        { id }
    );
    return rows?.[0] || null;
}

export async function deleteDocumentoById(id) {
    const doc = await getDocumentoById(id);
    if (!doc) return null;

    const [result] = await pool.query(
        `DELETE FROM BibliotecaDocumentos WHERE id = :id`,
        { id }
    );

    if (result.affectedRows === 0) return null;
    return doc; // devolve o doc para apagar arquivo físico
}

/* =========================
   PÚBLICO: árvore (pastas -> documentos)
   - Sem subpastas no schema atual
   - 2 queries (rápido / não pesa)
========================= */
export async function listArvorePublica() {
    const [pastas] = await pool.query(
        `SELECT id, nome, slug
     FROM BibliotecaPastas
     ORDER BY nome ASC`
    );

    const [docs] = await pool.query(
        `SELECT id, pasta_id, nome, slug, file_size, created_at, updated_at
     FROM BibliotecaDocumentos
     ORDER BY nome ASC`
    );

    const map = new Map();
    for (const p of pastas) {
        map.set(Number(p.id), {
            id: p.id,
            nome: p.nome,
            slug: p.slug,
            tipo: "PASTA",
            filhos: []
        });
    }

    for (const d of docs) {
        const pastaId = Number(d.pasta_id);
        const nodeDoc = {
            id: d.id,
            nome: d.nome,
            slug: d.slug,
            tipo: "DOCUMENTO",
            file_size: d.file_size,
            url: `/biblioteca/documentos/${d.id}/download`,
            created_at: d.created_at,
            updated_at: d.updated_at
        };

        if (map.has(pastaId)) {
            map.get(pastaId).filhos.push(nodeDoc);
        }
    }

    return Array.from(map.values());
}
