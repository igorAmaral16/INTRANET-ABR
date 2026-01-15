import { z } from "zod";
import {
    listFaqPublic,
    listFaqAdmin,
    getFaqById,
    createFaq,
    updateFaq,
    deleteFaq
} from "../services/faq.service.js";

const SafeText = z
    .string()
    .trim()
    .min(3)
    .max(180)
    .refine((s) => !/[<>]/.test(s), "Caracteres inválidos.");

const CategoriaText = z
    .string()
    .trim()
    .min(2)
    .max(80)
    .refine((s) => !/[<>]/.test(s), "Caracteres inválidos.");

const DescricaoText = z
    .string()
    .trim()
    .min(3)
    .max(20_000)
    .refine((s) => !/[<>]/.test(s), "Caracteres inválidos.");

const CreateUpdateSchema = z.object({
    titulo: SafeText.max(180),
    categoria: CategoriaText.max(80),
    descricao: DescricaoText,
    ativo: z.boolean().optional().default(true),
    ordem: z.coerce.number().int().min(0).max(1_000_000).optional().default(0)
});

export async function listarPublico(req, res) {
    const items = await listFaqPublic();
    res.json({ items });
}

export async function listarAdmin(req, res) {
    const items = await listFaqAdmin();
    res.json({ items });
}

export async function obterAdmin(req, res) {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const item = await getFaqById(id);
    if (!item) {
        return res.status(404).json({
            error: { message: "FAQ não encontrado.", requestId: req.id }
        });
    }
    res.json(item);
}

export async function criar(req, res) {
    const body = CreateUpdateSchema.parse(req.body);

    const created = await createFaq({
        titulo: body.titulo,
        categoria: body.categoria,
        descricao: body.descricao,
        ativo: body.ativo ? 1 : 0,
        ordem: body.ordem,
        adminId: Number(req.user.id)
    });

    res.status(201).json(created);
}

export async function atualizar(req, res) {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const body = CreateUpdateSchema.parse(req.body);

    const updated = await updateFaq(id, {
        titulo: body.titulo,
        categoria: body.categoria,
        descricao: body.descricao,
        ativo: body.ativo ? 1 : 0,
        ordem: body.ordem,
        adminId: Number(req.user.id)
    });

    if (!updated) {
        return res.status(404).json({
            error: { message: "FAQ não encontrado.", requestId: req.id }
        });
    }

    res.json(updated);
}

export async function excluir(req, res) {
    const id = z.coerce.number().int().positive().parse(req.params.id);

    const ok = await deleteFaq(id);
    if (!ok) {
        return res.status(404).json({
            error: { message: "FAQ não encontrado.", requestId: req.id }
        });
    }

    res.status(204).send();
}
