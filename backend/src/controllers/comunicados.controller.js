import { z } from "zod";
import { parseDdMmYyyyToDate } from "../utils/date.js";
import {
    createComunicado,
    updateComunicado,
    deleteComunicado,
    getComunicadoById,
    listPublicComunicados,
    listAdminComunicados
} from "../services/comunicados.service.js";
import { incrementAcessoHoje, incrementComunicadoViewHoje } from "../services/metrics.service.js";

const ImportanciaEnum = z.enum(["POUCO_RELEVANTE", "RELEVANTE", "IMPORTANTE"]);
const StatusEnum = z.enum(["RASCUNHO", "PUBLICADO"]);
const AnexoTipoEnum = z.enum(["NENHUM", "IMAGEM", "DOCUMENTO"]);

const PublicListQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20)
});

const AdminListQuery = z.object({
    status: StatusEnum.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const AnexoUrlSchema = z
    .string()
    .max(500)
    .refine((val) => {
        const v = val.trim();
        if (v.startsWith("/uploads/")) return true;
        try {
            const u = new URL(v);
            return u.protocol === "http:" || u.protocol === "https:";
        } catch {
            return false;
        }
    }, "anexo_url deve ser um caminho /uploads/... ou uma URL http(s).");

const CreateUpdateSchema = z.object({
    titulo: z.string().min(3).max(150),
    descricao: z.string().min(3).max(10_000),

    importancia: ImportanciaEnum,
    fixado_topo: z.boolean().optional().default(false),

    status: StatusEnum,

    expira_em: z.string().min(10).max(10).optional(),

    anexo_url: AnexoUrlSchema.optional(),
    anexo_tipo: AnexoTipoEnum.optional().default("NENHUM")
});

function ensureExpiryValidOrThrow({ status, expira_em }) {
    if (status !== "PUBLICADO") return null;

    if (!expira_em) {
        const e = new Error("expira_em é obrigatório para PUBLICADO (dd/mm/aaaa).");
        e.statusCode = 400;
        throw e;
    }

    const ymd = parseDdMmYyyyToDate(expira_em);
    if (!ymd) {
        const e = new Error("expira_em inválido. Use dd/mm/aaaa.");
        e.statusCode = 400;
        throw e;
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayYmd = `${yyyy}-${mm}-${dd}`;

    if (ymd <= todayYmd) {
        const e = new Error("expira_em deve ser acima do dia atual.");
        e.statusCode = 400;
        throw e;
    }

    return ymd;
}

function normalizeAnexo(body) {
    if (!body.anexo_url) {
        return { anexo_url: null, anexo_tipo: "NENHUM" };
    }

    if (body.anexo_tipo === "NENHUM") {
        const e = new Error("anexo_tipo deve ser IMAGEM ou DOCUMENTO quando anexo_url é informado.");
        e.statusCode = 400;
        throw e;
    }

    const raw = body.anexo_url.trim();

    if (!raw.startsWith("/uploads/")) {
        const u = new URL(raw);
        return { anexo_url: u.pathname, anexo_tipo: body.anexo_tipo };
    }

    return { anexo_url: raw, anexo_tipo: body.anexo_tipo };
}

/* =========================
   PÚBLICO (SEM LOGIN)
========================= */

export async function listarPublico(req, res) {
    // Instrumentação: “acesso” = GET /comunicados
    try {
        await incrementAcessoHoje();
    } catch (err) {
        req.log?.warn({ err }, "Failed to increment access metric");
    }

    const q = PublicListQuery.parse(req.query);
    const data = await listPublicComunicados(q);
    res.json(data);
}

export async function obterPublico(req, res) {
    const id = z.coerce.number().int().positive().parse(req.params.id);

    // Instrumentação: view do comunicado no dia
    try {
        await incrementComunicadoViewHoje(id);
    } catch (err) {
        req.log?.warn({ err }, "Failed to increment view metric");
    }

    const item = await getComunicadoById(id, { includeRascunho: false });
    if (!item) {
        return res.status(404).json({
            error: { message: "Comunicado não encontrado.", requestId: req.id }
        });
    }
    res.json(item);
}

/* =========================
   ADMIN (RH JR/SR)
========================= */

export async function listarAdmin(req, res) {
    const q = AdminListQuery.parse(req.query);
    const data = await listAdminComunicados(q);
    res.json(data);
}

export async function obterAdmin(req, res) {
    const id = z.coerce.number().int().positive().parse(req.params.id);

    // Também conta view quando o admin abre o detalhe (pode ser útil)
    try {
        await incrementComunicadoViewHoje(id);
    } catch (err) {
        req.log?.warn({ err }, "Failed to increment view metric (admin)");
    }

    const item = await getComunicadoById(id, { includeRascunho: true });
    if (!item) {
        return res.status(404).json({
            error: { message: "Comunicado não encontrado.", requestId: req.id }
        });
    }
    res.json(item);
}

export async function criar(req, res) {
    const body = CreateUpdateSchema.parse(req.body);

    const expira_ymd = ensureExpiryValidOrThrow(body);
    const anexo = normalizeAnexo(body);

    const created = await createComunicado({
        titulo: body.titulo.trim(),
        descricao: body.descricao.trim(),
        importancia: body.importancia,
        fixado_topo: body.fixado_topo ? 1 : 0,
        status: body.status,
        expira_em:
            body.status === "PUBLICADO"
                ? expira_ymd
                : (body.expira_em ? parseDdMmYyyyToDate(body.expira_em) : null),
        ...anexo,

        publicado_por_admin_id: Number(req.user.id),
        publicado_por_nome: req.user.username
    });

    res.status(201).json(created);
}

export async function atualizar(req, res) {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const body = CreateUpdateSchema.parse(req.body);

    const expira_ymd = ensureExpiryValidOrThrow(body);
    const anexo = normalizeAnexo(body);

    const updated = await updateComunicado(id, {
        titulo: body.titulo.trim(),
        descricao: body.descricao.trim(),
        importancia: body.importancia,
        fixado_topo: body.fixado_topo ? 1 : 0,
        status: body.status,
        expira_em:
            body.status === "PUBLICADO"
                ? expira_ymd
                : (body.expira_em ? parseDdMmYyyyToDate(body.expira_em) : null),
        ...anexo,

        publicado_por_admin_id: Number(req.user.id),
        publicado_por_nome: req.user.username
    });

    if (!updated) {
        return res.status(404).json({
            error: { message: "Comunicado não encontrado.", requestId: req.id }
        });
    }

    res.json(updated);
}

export async function excluir(req, res) {
    const id = z.coerce.number().int().positive().parse(req.params.id);

    const ok = await deleteComunicado(id);
    if (!ok) {
        return res.status(404).json({
            error: { message: "Comunicado não encontrado.", requestId: req.id }
        });
    }

    res.status(204).send();
}
