import { z } from "zod";
import { parseDdMmYyyyToDate } from "../utils/date.js";
import {
    listPublicCarouselItems,
    listPublicEventos,
    getCarouselItemById,
    listAdminCarouselItems,
    createCarouselItem,
    updateCarouselItem,
    deleteCarouselItem,
} from "../services/carousel.service.js";

const StatusEnum = z.enum(["RASCUNHO", "PUBLICADO"]);

const PublicListQuery = z.object({}); // no pagination for now, but kept for future

const CreateUpdateSchema = z.object({
    titulo: z.string().min(3).max(150),
    conteudo: z.string().min(1),
    imagem_url: z.string().max(500).optional(),
    status: StatusEnum.default("PUBLICADO"),
    publicado_em: z.string().min(10).max(10).optional(), // dd/mm/aaaa
    eh_evento: z.boolean().optional().default(false),
    foto_perfil: z.string().max(500).optional(),
}).refine(
    (data) => !data.eh_evento || (data.eh_evento && data.foto_perfil),
    {
        message: "Foto de perfil é obrigatória quando marcado como evento",
        path: ["foto_perfil"],
    }
);

/* ===== PÚBLICO ===== */
export async function listarPublico(req, res) {
    const data = await listPublicCarouselItems();
    res.json(data);
}

export async function listarEventos(req, res) {
    const data = await listPublicEventos();
    res.json(data);
}

export async function obterPublico(req, res) {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const item = await getCarouselItemById(id);
    if (!item || item.status !== "PUBLICADO") {
        return res.status(404).json({
            error: { message: "Anúncio não encontrado.", requestId: req.id },
        });
    }
    res.json(item);
}

/* ===== ADMIN ===== */
export async function listarAdmin(req, res) {
    const data = await listAdminCarouselItems();
    res.json(data);
}

export async function obterAdmin(req, res) {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const item = await getCarouselItemById(id);
    if (!item) {
        return res.status(404).json({
            error: { message: "Anúncio não encontrado.", requestId: req.id },
        });
    }
    res.json(item);
}

export async function criar(req, res) {
    const body = CreateUpdateSchema.parse(req.body);

    // default to today if not sent
    function hojeDdMmYyyy() {
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    if (!body.publicado_em) {
        body.publicado_em = hojeDdMmYyyy();
    }

    // convert date string to MySQL format
    const { parseDdMmYyyyToDate } = await import("../utils/date.js");
    if (body.publicado_em) {
        const ymd = parseDdMmYyyyToDate(body.publicado_em);
        if (!ymd) {
            return res.status(400).json({ error: { message: "publicado_em inválido (use dd/mm/aaaa)", requestId: req.id } });
        }
        body.publicado_em = ymd;
    }

    const item = await createCarouselItem({
        ...body,
        publicado_por_admin_id: req.user?.id,
        publicado_por_nome: req.user?.username || null,
    });
    res.status(201).json(item);
}

export async function atualizar(req, res) {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const body = CreateUpdateSchema.parse(req.body);

    if (body.publicado_em) {
        const { parseDdMmYyyyToDate } = await import("../utils/date.js");
        const ymd = parseDdMmYyyyToDate(body.publicado_em);
        if (!ymd) {
            return res.status(400).json({ error: { message: "publicado_em inválido (use dd/mm/aaaa)", requestId: req.id } });
        }
        body.publicado_em = ymd;
    }

    const item = await updateCarouselItem(id, body);
    if (!item) {
        return res.status(404).json({
            error: { message: "Anúncio não encontrado.", requestId: req.id },
        });
    }
    res.json(item);
}

export async function excluir(req, res) {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const ok = await deleteCarouselItem(id);
    res.json({ success: ok });
}
