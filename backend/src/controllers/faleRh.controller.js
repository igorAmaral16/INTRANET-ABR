import { z } from "zod";
import {
    createConversationWithFirstMessage,
    listColabConversations,
    getConversationForColab,
    getConversationForAdmin,
    listAdminConversations,
    insertMessageAsColab,
    insertMessageAsAdmin,
    acceptConversationAsAdmin,
    closeConversation,
    markReadColab,
    markReadAdmin
} from "../services/faleRh.service.js";

const IdSchema = z.coerce.number().int().positive();

const StatusEnum = z.enum(["PENDENTE", "ABERTA", "FECHADA"]);

const ListQuerySchema = z.object({
    status: StatusEnum.optional(),
    search: z.string().trim().min(1).max(80).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const CreateColabSchema = z.object({
    categoria: z.string().trim().min(2).max(80),
    assunto: z.string().trim().min(2).max(150).optional(),
    preset_key: z.string().trim().min(1).max(60).optional(),
    mensagem: z.string().trim().min(3).max(4000)
});

const SendMessageSchema = z.object({
    tipo: z.enum(["PRESET", "TEXTO"]).optional().default("TEXTO"),
    preset_key: z.string().trim().min(1).max(60).optional(),
    conteudo: z.string().trim().min(1).max(4000)
});

/* =========================
   COLAB
========================= */

export async function colabCriarConversa(req, res) {
    const body = CreateColabSchema.parse(req.body);

    const colaboradorId = Number(req.user?.id);
    const matricula = String(req.user?.matricula || "");
    const nome = String(req.user?.nome_completo || req.user?.username || "");

    if (!colaboradorId || !matricula) {
        return res.status(401).json({
            error: { message: "Não autenticado.", requestId: req.id }
        });
    }

    const created = await createConversationWithFirstMessage({
        colaboradorId,
        colaboradorMatricula: matricula,
        colaboradorNome: nome || null,
        categoria: body.categoria,
        assunto: body.assunto || null,
        firstMessage: {
            tipo: body.preset_key ? "PRESET" : "TEXTO",
            preset_key: body.preset_key || null,
            conteudo: body.mensagem
        }
    });

    return res.status(201).json(created);
}

export async function colabListarConversas(req, res) {
    const q = ListQuerySchema.parse(req.query);

    const colaboradorId = Number(req.user?.id);
    const matricula = String(req.user?.matricula || "");
    if (!colaboradorId || !matricula) {
        return res.status(401).json({
            error: { message: "Não autenticado.", requestId: req.id }
        });
    }

    const data = await listColabConversations({
        colaboradorId,
        status: q.status,
        search: q.search,
        page: q.page,
        pageSize: q.pageSize
    });

    return res.json(data);
}

export async function colabObterConversa(req, res) {
    const id = IdSchema.parse(req.params.id);

    const colaboradorId = Number(req.user?.id);
    if (!colaboradorId) {
        return res.status(401).json({
            error: { message: "Não autenticado.", requestId: req.id }
        });
    }

    const data = await getConversationForColab({ conversationId: id, colaboradorId });
    if (!data) {
        return res.status(404).json({
            error: { message: "Conversa não encontrada.", requestId: req.id }
        });
    }

    return res.json(data);
}

export async function colabEnviarMensagem(req, res) {
    const id = IdSchema.parse(req.params.id);
    const body = SendMessageSchema.parse(req.body);

    const colaboradorId = Number(req.user?.id);
    if (!colaboradorId) {
        return res.status(401).json({
            error: { message: "Não autenticado.", requestId: req.id }
        });
    }

    const ok = await insertMessageAsColab({
        conversationId: id,
        colaboradorId,
        tipo: body.tipo,
        preset_key: body.tipo === "PRESET" ? (body.preset_key || null) : null,
        conteudo: body.conteudo
    });

    if (!ok) {
        return res.status(400).json({
            error: { message: "Não foi possível enviar mensagem (conversa inexistente/fechada ou não pertence ao colaborador).", requestId: req.id }
        });
    }

    return res.status(201).json({ ok: true });
}

export async function colabFecharConversa(req, res) {
    const id = IdSchema.parse(req.params.id);

    const colaboradorId = Number(req.user?.id);
    if (!colaboradorId) {
        return res.status(401).json({
            error: { message: "Não autenticado.", requestId: req.id }
        });
    }

    const ok = await closeConversation({ conversationId: id, by: "COLAB", actorId: colaboradorId, scope: "COLAB" });
    if (!ok) {
        return res.status(400).json({
            error: { message: "Não foi possível fechar a conversa (não encontrada ou já fechada).", requestId: req.id }
        });
    }

    return res.status(204).send();
}

export async function colabMarcarComoLida(req, res) {
    const id = IdSchema.parse(req.params.id);

    const colaboradorId = Number(req.user?.id);
    if (!colaboradorId) {
        return res.status(401).json({
            error: { message: "Não autenticado.", requestId: req.id }
        });
    }

    const ok = await markReadColab({ conversationId: id, colaboradorId });
    if (!ok) {
        return res.status(404).json({
            error: { message: "Conversa não encontrada.", requestId: req.id }
        });
    }

    return res.status(204).send();
}

/* =========================
   ADMIN
========================= */

export async function adminListarConversas(req, res) {
    const q = ListQuerySchema.parse(req.query);

    const adminId = Number(req.user?.id);
    if (!adminId) {
        return res.status(401).json({
            error: { message: "Não autenticado.", requestId: req.id }
        });
    }

    const data = await listAdminConversations({
        status: q.status,
        search: q.search,
        page: q.page,
        pageSize: q.pageSize
    });

    return res.json(data);
}

export async function adminObterConversa(req, res) {
    const id = IdSchema.parse(req.params.id);

    const adminId = Number(req.user?.id);
    if (!adminId) {
        return res.status(401).json({
            error: { message: "Não autenticado.", requestId: req.id }
        });
    }

    const data = await getConversationForAdmin({ conversationId: id });
    if (!data) {
        return res.status(404).json({
            error: { message: "Conversa não encontrada.", requestId: req.id }
        });
    }

    return res.json(data);
}

export async function adminAceitarConversa(req, res) {
    const id = IdSchema.parse(req.params.id);
    const adminId = Number(req.user?.id);

    const updated = await acceptConversationAsAdmin({ conversationId: id, adminId });
    if (!updated) {
        return res.status(400).json({
            error: { message: "Não foi possível aceitar (conversa inexistente ou já aceita/fechada).", requestId: req.id }
        });
    }

    return res.status(200).json(updated);
}

export async function adminEnviarMensagem(req, res) {
    const id = IdSchema.parse(req.params.id);
    const body = SendMessageSchema.parse(req.body);

    const adminId = Number(req.user?.id);

    const ok = await insertMessageAsAdmin({
        conversationId: id,
        adminId,
        tipo: body.tipo,
        preset_key: body.tipo === "PRESET" ? (body.preset_key || null) : null,
        conteudo: body.conteudo
    });

    if (!ok) {
        return res.status(400).json({
            error: { message: "Não foi possível enviar mensagem (conversa inexistente/fechada).", requestId: req.id }
        });
    }

    return res.status(201).json({ ok: true });
}

export async function adminFecharConversa(req, res) {
    const id = IdSchema.parse(req.params.id);
    const adminId = Number(req.user?.id);

    const ok = await closeConversation({ conversationId: id, by: "ADMIN", actorId: adminId, scope: "ADMIN" });
    if (!ok) {
        return res.status(400).json({
            error: { message: "Não foi possível fechar a conversa (não encontrada ou já fechada).", requestId: req.id }
        });
    }

    return res.status(204).send();
}

export async function adminMarcarComoLida(req, res) {
    const id = IdSchema.parse(req.params.id);

    const ok = await markReadAdmin({ conversationId: id });
    if (!ok) {
        return res.status(404).json({
            error: { message: "Conversa não encontrada.", requestId: req.id }
        });
    }

    return res.status(204).send();
}
