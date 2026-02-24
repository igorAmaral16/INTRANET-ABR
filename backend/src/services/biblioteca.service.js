import { pool } from "../config/db.js";

export async function createPasta({ nome, slug, adminId, isPrivate = false }) {
    const [result] = await pool.query(
        `INSERT INTO BibliotecaPastas (nome, slug, created_by_admin_id, is_private)
     VALUES (:nome, :slug, :adminId, :isPrivate)`,
        { nome, slug, adminId, isPrivate }
    );
    return getPastaById(result.insertId);
}

export async function listPastas({ publicOnly = false, privateOnly = false } = {}) {
    // convenience function for different callers
    let clause = "";
    if (publicOnly) {
        clause = "WHERE is_private = 0";
    } else if (privateOnly) {
        clause = "WHERE is_private = 1";
    }
    const [rows] = await pool.query(
        `SELECT id, nome, slug, is_private, created_at, updated_at
     FROM BibliotecaPastas
     ${clause}
     ORDER BY nome ASC`,
        {}
    );
    return rows;
}

export async function getPastaById(id) {
    const [rows] = await pool.query(
        `SELECT id, nome, slug, is_private, created_at, updated_at
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
    adminId,
    destinatarioMatricula = null // string or null
}) {
    const [result] = await pool.query(
        `INSERT INTO BibliotecaDocumentos
      (pasta_id, nome, slug, file_path, file_size, file_hash, mime_type, created_by_admin_id, destinatario_matricula)
     VALUES
      (:pastaId, :nome, :slug, :filePath, :fileSize, :fileHash, :mimeType, :adminId, :destMatricula)`,
        {
            pastaId,
            nome,
            slug,
            filePath,
            fileSize,
            fileHash,
            mimeType,
            adminId,
            destMatricula: destinatarioMatricula
        }
    );
    return getDocumentoById(result.insertId);
}

export async function listDocumentosByPasta(pastaId) {
    // Public listing: exclude documents targeted to specific collaborators
    const [rows] = await pool.query(
        `SELECT id, pasta_id, nome, slug, file_size, created_at, updated_at
     FROM BibliotecaDocumentos
     WHERE pasta_id = :pastaId AND destinatario_matricula IS NULL
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
    // Exclude targeted documents from public tree
    // 1) pastas (only non-private)
    const [pastas] = await pool.query(
        `SELECT id, nome, is_private
         FROM BibliotecaPastas
         WHERE is_private = 0
         ORDER BY nome ASC`
    );

    // 2) docs (public docs only)
    const [docs] = await pool.query(
        `SELECT id, pasta_id, nome
         FROM BibliotecaDocumentos
         WHERE destinatario_matricula IS NULL
         ORDER BY nome ASC`
    );

    const mapPastas = new Map();
    for (const p of pastas) {
        mapPastas.set(String(p.id), {
            id: p.id,
            nome: p.nome,
            tipo: "PASTA",
            filhos: []
        });
    }

    const raiz = Array.from(mapPastas.values());

    for (const d of docs) {
        const pastaId = String(d.pasta_id || "");
        const docNode = {
            id: d.id,
            nome: d.nome,
            tipo: "DOCUMENTO",
            url: `/biblioteca/documentos/${d.id}/download`
        };
        if (mapPastas.has(pastaId)) mapPastas.get(pastaId).filhos.push(docNode);
    }

    return raiz;
}

// admin tree: return every folder (public+private) and every document (regardless of destinatary)
export async function listArvoreAdmin() {
    // 1) all pastas
    const [pastas] = await pool.query(
        `SELECT id, nome, is_private
         FROM BibliotecaPastas
         ORDER BY nome ASC`
    );

    // 2) all docs (any destinatario)
    const [docs] = await pool.query(
        `SELECT id, pasta_id, nome
         FROM BibliotecaDocumentos
         ORDER BY nome ASC`
    );

    const mapPastas = new Map();
    for (const p of pastas) {
        mapPastas.set(String(p.id), {
            id: p.id,
            nome: p.nome,
            tipo: "PASTA",
            filhos: [],
            is_private: Boolean(p.is_private)
        });
    }

    const raiz = Array.from(mapPastas.values());

    for (const d of docs) {
        const pastaId = String(d.pasta_id || "");
        const docNode = {
            id: d.id,
            nome: d.nome,
            tipo: "DOCUMENTO",
            url: `/biblioteca/documentos/${d.id}/download`
        };
        if (mapPastas.has(pastaId)) mapPastas.get(pastaId).filhos.push(docNode);
    }

    return raiz;
}

// =====================
// PERSONALIZADO: documentos para colaborador específico
// =====================
export async function listDocumentosByPastaForColab(pastaId, matricula) {
    const [rows] = await pool.query(
        `SELECT id, pasta_id, nome, slug, file_size, created_at, updated_at
         FROM BibliotecaDocumentos
         WHERE pasta_id = :pastaId AND destinatario_matricula = :matricula
         ORDER BY nome ASC`,
        { pastaId, matricula }
    );
    return rows;
}

export async function listArvoreForColab(matricula) {
    // Show ALL private folders to ALL collaborators; only filter documents by matricula
    const [pastas] = await pool.query(
        `SELECT id, nome
         FROM BibliotecaPastas
         WHERE is_private = 1
         ORDER BY nome ASC`
    );

    const [docs] = await pool.query(
        `SELECT id, pasta_id, nome
         FROM BibliotecaDocumentos
         WHERE destinatario_matricula = :matricula
         ORDER BY nome ASC`,
        { matricula }
    );

    const mapPastas = new Map();
    for (const p of pastas) {
        mapPastas.set(String(p.id), {
            id: p.id,
            nome: p.nome,
            tipo: "PASTA",
            filhos: []
        });
    }

    for (const d of docs) {
        const pastaId = String(d.pasta_id || "");
        const docNode = {
            id: d.id,
            nome: d.nome,
            tipo: "DOCUMENTO",
            url: `/biblioteca/documentos/${d.id}/download`
        };
        if (mapPastas.has(pastaId)) mapPastas.get(pastaId).filhos.push(docNode);
    }

    // Return ALL folders (even if empty for this user)
    const raiz = Array.from(mapPastas.values());
    return raiz;
}

export async function updatePastaById({ pastaId, nome, slug, adminId, isPrivate }) {
    const updates = [`nome = :nome`, `slug = :slug`, `updated_at = NOW()`];
    if (isPrivate !== undefined) {
        updates.push(`is_private = :isPrivate`);
    }

    const [result] = await pool.query(
        `UPDATE BibliotecaPastas
         SET ${updates.join(",\n             ")}
         WHERE id = :id`,
        { id: pastaId, nome, slug, adminId, isPrivate }
    );

    if (result.affectedRows === 0) return null;
    return getPastaById(pastaId);
}
