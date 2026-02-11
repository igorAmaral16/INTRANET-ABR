import { pool } from "../config/db.js";
import crypto from "node:crypto";
import { getIo } from "../realtime/socket.js";

async function fetchMessageById(messageId) {
    const [rows] = await pool.query(
        `SELECT id, conversation_id, sender_role, sender_id, tipo, preset_key, conteudo, created_at
     FROM rh_messages WHERE id = ? LIMIT 1`,
        [messageId]
    );
    return rows?.[0] || null;
}

async function fetchConversationById(conversationId) {
    const [rows] = await pool.query(`SELECT * FROM rh_conversations WHERE id = ? LIMIT 1`, [conversationId]);
    return rows?.[0] || null;
}

/**
 * Convenção:
 * - rh_conversations (id = UUID CHAR(36))
 * - rh_messages      (id = UUID CHAR(36), conversation_id = UUID CHAR(36))
 */

function toLimitOffset(page, pageSize) {
    const p = Math.max(1, Number(page || 1));
    const s = Math.min(100, Math.max(1, Number(pageSize || 20)));
    return { limit: s, offset: (p - 1) * s, page: p, pageSize: s };
}

function newUuid() {
    return crypto.randomUUID();
}

export async function createConversationWithFirstMessage({
    colaboradorId,
    colaboradorMatricula,
    colaboradorNome,
    categoria,
    assunto,
    firstMessage
}) {
    const conversationId = newUuid();
    const messageId = newUuid();

    // 1) cria conversa (PENDENTE)
    await pool.query(
        `
      INSERT INTO rh_conversations
        (id, colaborador_id, colaborador_matricula, colaborador_nome, status, categoria, assunto, last_message_at, created_at)
      VALUES
        (?, ?, ?, ?, 'PENDENTE', ?, ?, NOW(), NOW())
    `,
        [conversationId, colaboradorId, colaboradorMatricula, colaboradorNome, categoria, assunto]
    );

    // 2) cria primeira mensagem
    await pool.query(
        `
      INSERT INTO rh_messages
        (id, conversation_id, sender_role, sender_id, tipo, preset_key, conteudo, created_at)
      VALUES
        (?, ?, 'COLAB', ?, ?, ?, ?, NOW())
    `,
        [messageId, conversationId, colaboradorId, firstMessage.tipo, firstMessage.preset_key, firstMessage.conteudo]
    );

    await pool.query(
        `UPDATE rh_conversations SET updated_at = NOW(), last_message_at = NOW() WHERE id = ?`,
        [conversationId]
    );

    return await getConversationForColab({ conversationId, colaboradorId });
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
        created_at ASC
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

    // requisito: antigas no topo => created_at ASC
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
    const [rows] = await pool.query(
        `SELECT id, status FROM rh_conversations WHERE id = ? AND colaborador_id = ? LIMIT 1`,
        [conversationId, colaboradorId]
    );

    const convo = rows?.[0];
    if (!convo) return false;
    if (convo.status === "FECHADA") return false;

    const messageId = newUuid();

    await pool.query(
        `
      INSERT INTO rh_messages (id, conversation_id, sender_role, sender_id, tipo, preset_key, conteudo, created_at)
      VALUES (?, ?, 'COLAB', ?, ?, ?, ?, NOW())
    `,
        [messageId, conversationId, colaboradorId, tipo, preset_key, conteudo]
    );

    await pool.query(
        `UPDATE rh_conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [conversationId]
    );

    const io = getIo();
    const msgRow = await fetchMessageById(messageId);
    const convoRow = await fetchConversationById(conversationId);

    // Atualiza chat em tempo real (room da conversa)
    io.to(`rh:${conversationId}`).emit("rh:message", {
        conversationId,
        message: msgRow
    });

    // Atualiza lista (conversa) em tempo real (para o colab dono e admins)
    io.to(`colab:${colaboradorId}`).emit("rh:conversation:update", {
        conversationId,
        patch: {
            last_message_at: convoRow?.last_message_at,
            updated_at: convoRow?.updated_at,
            status: convoRow?.status
        }
    });

    // Inbox admin (todos admins)
    io.to("role:ADMIN").emit("rh:conversation:update", {
        conversationId,
        patch: {
            last_message_at: convoRow?.last_message_at,
            updated_at: convoRow?.updated_at,
            status: convoRow?.status
        }
    });

    // NOTIFICAÇÃO para ADMIN (para sino/alerta)
    io.to("role:ADMIN").emit("rh:notify", {
        conversationId,
        preview: msgRow?.conteudo?.slice(0, 80) || "Nova mensagem do colaborador",
        created_at: msgRow?.created_at,
        from: {
            colaborador_id: convoRow?.colaborador_id,
            colaborador_matricula: convoRow?.colaborador_matricula,
            colaborador_nome: convoRow?.colaborador_nome
        }
    });

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

    // regra: Admin só responde se ABERTA (evita responder pendente sem aceitar)
    if (convo.status !== "ABERTA") return false;

    const messageId = newUuid();

    await pool.query(
        `
      INSERT INTO rh_messages (id, conversation_id, sender_role, sender_id, tipo, preset_key, conteudo, created_at)
      VALUES (?, ?, 'ADMIN', ?, ?, ?, ?, NOW())
    `,
        [messageId, conversationId, adminId, tipo, preset_key, conteudo]
    );

    await pool.query(
        `UPDATE rh_conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [conversationId]
    );

    const io = getIo();
    const msgRow = await fetchMessageById(messageId);
    const convoRow = await fetchConversationById(conversationId);

    io.to(`rh:${conversationId}`).emit("rh:message", {
        conversationId,
        message: msgRow
    });

    // Atualiza lista de admin (todos admins) e do colab específico
    io.to("role:ADMIN").emit("rh:conversation:update", {
        conversationId,
        patch: { last_message_at: convoRow?.last_message_at, updated_at: convoRow?.updated_at, status: convoRow?.status }
    });

    io.to(`colab:${convoRow.colaborador_id}`).emit("rh:conversation:update", {
        conversationId,
        patch: { last_message_at: convoRow?.last_message_at, updated_at: convoRow?.updated_at, status: convoRow?.status }
    });

    // NOTIFICAÇÃO para o COLAB (sino)
    io.to(`colab:${convoRow.colaborador_id}`).emit("rh:notify", {
        conversationId,
        preview: msgRow?.conteudo?.slice(0, 80) || "Nova mensagem do RH",
        created_at: msgRow?.created_at
    });

    return true;
}

export async function acceptConversationAsAdmin({ conversationId, adminId }) {
    const [r] = await pool.query(
        `
      UPDATE rh_conversations
      SET status = 'ABERTA', assignee_admin_id = ?, accepted_at = NOW(), updated_at = NOW()
      WHERE id = ? AND status = 'PENDENTE'
    `,
        [adminId, conversationId]
    );

    if (!r.affectedRows) return null;

    const updated = await fetchConversationById(conversationId);

    const io = getIo();

    // Atualiza room da conversa
    io.to(`rh:${conversationId}`).emit("rh:conversation:update", {
        conversationId,
        patch: {
            status: "ABERTA",
            assignee_admin_id: adminId,
            accepted_at: updated?.accepted_at
        }
    });

    // Atualiza inbox/admins
    io.to("role:ADMIN").emit("rh:conversation:update", {
        conversationId,
        patch: {
            status: "ABERTA",
            assignee_admin_id: adminId,
            accepted_at: updated?.accepted_at
        }
    });

    // Atualiza dono (colab)
    if (updated?.colaborador_id) {
        io.to(`colab:${updated.colaborador_id}`).emit("rh:conversation:update", {
            conversationId,
            patch: {
                status: "ABERTA",
                assignee_admin_id: adminId,
                accepted_at: updated?.accepted_at
            }
        });
    }

    return updated || null;
}

export async function closeConversation({ conversationId, by, actorId, scope }) {
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

    const [r] = await pool.query(
        `
      UPDATE rh_conversations
      SET status = 'FECHADA', closed_at = NOW(), closed_by = ?, updated_at = NOW()
      WHERE id = ? AND status <> 'FECHADA'
    `,
        [by, conversationId]
    );

    const io = getIo();
    const convoRow = await fetchConversationById(conversationId);

    io.to(`rh:${conversationId}`).emit("rh:conversation:update", {
        conversationId,
        patch: { status: "FECHADA", closed_at: convoRow?.closed_at, closed_by: convoRow?.closed_by }
    });
    io.to("role:ADMIN").emit("rh:conversation:update", { conversationId, patch: { status: "FECHADA" } });
    if (convoRow?.colaborador_id) {
        io.to(`colab:${convoRow.colaborador_id}`).emit("rh:conversation:update", {
            conversationId,
            patch: { status: "FECHADA" }
        });
    }

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
