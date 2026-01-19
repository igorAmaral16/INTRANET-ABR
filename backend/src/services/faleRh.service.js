import { pool } from "../config/db.js";

/**
 * Convenção:
 * - rh_conversations
 * - rh_messages
 */

function toLimitOffset(page, pageSize) {
    const p = Math.max(1, Number(page || 1));
    const s = Math.min(100, Math.max(1, Number(pageSize || 20)));
    return { limit: s, offset: (p - 1) * s, page: p, pageSize: s };
}

export async function createConversationWithFirstMessage({
    colaboradorId,
    colaboradorMatricula,
    colaboradorNome,
    categoria,
    assunto,
    firstMessage
}) {
    const conn = pool;

    // 1) cria conversa (PENDENTE)
    const [r1] = await conn.query(
        `
    INSERT INTO rh_conversations
      (colaborador_id, colaborador_matricula, colaborador_nome, status, categoria, assunto, last_message_at)
    VALUES
      (?, ?, ?, 'PENDENTE', ?, ?, NOW())
    `,
        [colaboradorId, colaboradorMatricula, colaboradorNome, categoria, assunto]
    );

    const conversationId = r1.insertId;

    // 2) cria primeira mensagem
    await conn.query(
        `
    INSERT INTO rh_messages
      (conversation_id, sender_role, sender_id, tipo, preset_key, conteudo, created_at)
    VALUES
      (?, 'COLAB', ?, ?, ?, ?, NOW())
    `,
        [conversationId, colaboradorId, firstMessage.tipo, firstMessage.preset_key, firstMessage.conteudo]
    );

    const convo = await getConversationForColab({ conversationId, colaboradorId });
    return convo;
}

export async function listColabConversations({ colaboradorId, status, search, page, pageSize }) {
    const { limit, offset } = toLimitOffset(page, pageSize);

    const where = ["colaborador_id = ?"];
    const params = [colaboradorId];

    if (status) {
        where.push("status = ?");
        params.push(status);
    }
    if (search) {
        where.push("(categoria LIKE ? OR assunto LIKE ? OR colaborador_matricula LIKE ? OR colaborador_nome LIKE ?)");
        const s = `%${search}%`;
        params.push(s, s, s, s);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM rh_conversations ${whereSql}`,
        params
    );

    const total = Number(countRows?.[0]?.total || 0);

    const [rows] = await pool.query(
        `
    SELECT
      id, status, categoria, assunto,
      colaborador_matricula, colaborador_nome,
      assignee_admin_id,
      created_at, updated_at, accepted_at, closed_at, closed_by,
      last_message_at, last_read_colab_at, last_read_admin_at
    FROM rh_conversations
    ${whereSql}
    ORDER BY
      CASE status
        WHEN 'PENDENTE' THEN 0
        WHEN 'ABERTA' THEN 1
        WHEN 'FECHADA' THEN 2
      END,
      last_message_at DESC
    LIMIT ? OFFSET ?
    `,
        [...params, limit, offset]
    );

    return { items: rows, total };
}

export async function listAdminConversations({ status, search, page, pageSize }) {
    const { limit, offset } = toLimitOffset(page, pageSize);

    const where = ["1=1"];
    const params = [];

    if (status) {
        where.push("status = ?");
        params.push(status);
    }

    if (search) {
        where.push("(categoria LIKE ? OR assunto LIKE ? OR colaborador_matricula LIKE ? OR colaborador_nome LIKE ?)");
        const s = `%${search}%`;
        params.push(s, s, s, s);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM rh_conversations ${whereSql}`,
        params
    );

    const total = Number(countRows?.[0]?.total || 0);

    // Requisito do usuário: "antigas recebidas no topo" (ordem crescente por created_at)
    const [rows] = await pool.query(
        `
    SELECT
      id, status, categoria, assunto,
      colaborador_matricula, colaborador_nome,
      assignee_admin_id,
      created_at, updated_at, accepted_at, closed_at, closed_by,
      last_message_at, last_read_colab_at, last_read_admin_at
    FROM rh_conversations
    ${whereSql}
    ORDER BY
      CASE status
        WHEN 'PENDENTE' THEN 0
        WHEN 'ABERTA' THEN 1
        WHEN 'FECHADA' THEN 2
      END,
      created_at ASC
    LIMIT ? OFFSET ?
    `,
        [...params, limit, offset]
    );

    return { items: rows, total };
}

export async function getConversationForColab({ conversationId, colaboradorId }) {
    const [rows] = await pool.query(
        `
    SELECT *
    FROM rh_conversations
    WHERE id = ? AND colaborador_id = ?
    LIMIT 1
    `,
        [conversationId, colaboradorId]
    );
    const convo = rows?.[0];
    if (!convo) return null;

    const [msgs] = await pool.query(
        `
    SELECT id, conversation_id, sender_role, sender_id, tipo, preset_key, conteudo, created_at
    FROM rh_messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
    LIMIT 300
    `,
        [conversationId]
    );

    return { conversation: convo, messages: msgs };
}

export async function getConversationForAdmin({ conversationId }) {
    const [rows] = await pool.query(
        `
    SELECT *
    FROM rh_conversations
    WHERE id = ?
    LIMIT 1
    `,
        [conversationId]
    );
    const convo = rows?.[0];
    if (!convo) return null;

    const [msgs] = await pool.query(
        `
    SELECT id, conversation_id, sender_role, sender_id, tipo, preset_key, conteudo, created_at
    FROM rh_messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
    LIMIT 300
    `,
        [conversationId]
    );

    return { conversation: convo, messages: msgs };
}

export async function insertMessageAsColab({ conversationId, colaboradorId, tipo, preset_key, conteudo }) {
    // valida posse e status
    const [rows] = await pool.query(
        `SELECT id, status FROM rh_conversations WHERE id = ? AND colaborador_id = ? LIMIT 1`,
        [conversationId, colaboradorId]
    );
    const convo = rows?.[0];
    if (!convo) return false;
    if (convo.status === "FECHADA") return false;

    await pool.query(
        `
    INSERT INTO rh_messages (conversation_id, sender_role, sender_id, tipo, preset_key, conteudo, created_at)
    VALUES (?, 'COLAB', ?, ?, ?, ?, NOW())
    `,
        [conversationId, colaboradorId, tipo, preset_key, conteudo]
    );

    await pool.query(
        `UPDATE rh_conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [conversationId]
    );

    return true;
}

export async function insertMessageAsAdmin({ conversationId, adminId, tipo, preset_key, conteudo }) {
    const [rows] = await pool.query(
        `SELECT id, status FROM rh_conversations WHERE id = ? LIMIT 1`,
        [conversationId]
    );
    const convo = rows?.[0];
    if (!convo) return false;
    if (convo.status === "FECHADA") return false;

    await pool.query(
        `
    INSERT INTO rh_messages (conversation_id, sender_role, sender_id, tipo, preset_key, conteudo, created_at)
    VALUES (?, 'ADMIN', ?, ?, ?, ?, NOW())
    `,
        [conversationId, adminId, tipo, preset_key, conteudo]
    );

    await pool.query(
        `UPDATE rh_conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [conversationId]
    );

    return true;
}

export async function acceptConversationAsAdmin({ conversationId, adminId }) {
    // Aceita somente se estiver pendente
    const [r] = await pool.query(
        `
    UPDATE rh_conversations
    SET status = 'ABERTA', assignee_admin_id = ?, accepted_at = NOW(), updated_at = NOW()
    WHERE id = ? AND status = 'PENDENTE'
    `,
        [adminId, conversationId]
    );

    if (!r.affectedRows) return null;

    const [rows] = await pool.query(`SELECT * FROM rh_conversations WHERE id = ? LIMIT 1`, [conversationId]);
    return rows?.[0] || null;
}

export async function closeConversation({ conversationId, by, actorId, scope }) {
    // scope = "ADMIN" ou "COLAB" para validar posse
    if (scope === "COLAB") {
        const [r] = await pool.query(
            `
      UPDATE rh_conversations
      SET status = 'FECHADA', closed_at = NOW(), closed_by = ?, updated_at = NOW()
      WHERE id = ? AND colaborador_id = ? AND status <> 'FECHADA'
      `,
            [by, conversationId, actorId]
        );
        return Boolean(r.affectedRows);
    }

    // ADMIN fecha qualquer conversa
    const [r] = await pool.query(
        `
    UPDATE rh_conversations
    SET status = 'FECHADA', closed_at = NOW(), closed_by = ?, updated_at = NOW()
    WHERE id = ? AND status <> 'FECHADA'
    `,
        [by, conversationId]
    );

    return Boolean(r.affectedRows);
}

export async function markReadColab({ conversationId, colaboradorId }) {
    const [r] = await pool.query(
        `UPDATE rh_conversations SET last_read_colab_at = NOW() WHERE id = ? AND colaborador_id = ?`,
        [conversationId, colaboradorId]
    );
    return Boolean(r.affectedRows);
}

export async function markReadAdmin({ conversationId }) {
    const [r] = await pool.query(
        `UPDATE rh_conversations SET last_read_admin_at = NOW() WHERE id = ?`,
        [conversationId]
    );
    return Boolean(r.affectedRows);
}
