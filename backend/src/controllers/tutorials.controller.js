import { z } from "zod";
import {
    createTutorial,
    listPublicTutorials,
    listAdminTutorials,
    getTutorialById,
    deleteTutorial,
    updateTutorial
} from "../services/tutorials.service.js";
import { parseDdMmYyyyToDate } from "../utils/date.js";

// URL will be generated server-side after multer stores the file
const CreateSchema = z.object({
    setor: z.string().min(1),
    titulo: z.string().min(3).max(150),
    descricao: z.string().min(3).max(10000),
    data_publicacao: z.string().min(10).max(10) // expect dd/mm/yyyy
});

export async function listarPublico(req, res) {
    const setor = z.string().min(1).parse(req.query.setor);
    const items = await listPublicTutorials({ setor });
    res.json(items);
}

export async function obterPublico(req, res) {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const item = await getTutorialById(id);
    if (!item) {
        return res.status(404).json({ error: { message: "Tutorial não encontrado.", requestId: req.id } });
    }
    res.json(item);
}

export async function listarAdmin(req, res) {
    const setor = typeof req.query.setor === "string" ? req.query.setor : undefined;
    const items = await listAdminTutorials({ setor });
    res.json(items);
}

export async function criarAdmin(req, res) {
    const body = CreateSchema.parse(req.body);

    // validate/convert date
    const ymd = parseDdMmYyyyToDate(body.data_publicacao);
    if (!ymd) {
        return res.status(400).json({ error: { message: "data_publicacao inválida (dd/mm/aaaa).", requestId: req.id } });
    }

    // file should have been saved by multer
    if (!req.file) {
        return res.status(400).json({ error: { message: "Arquivo de vídeo é obrigatório (field: file).", requestId: req.id } });
    }

    const url = `/uploads/tutorials/${body.setor}/${req.file.filename}`;

    const id = await createTutorial({
        ...body,
        data_publicacao: ymd,
        url,
        publicado_por_admin_id: req.user?.id,
        publicado_por_nome: req.user?.nome || null
    });
    res.status(201).json(id);
}

export async function excluirAdmin(req, res) {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const ok = await deleteTutorial(id);
    if (!ok) {
        return res.status(404).json({ error: { message: "Tutorial não encontrado.", requestId: req.id } });
    }
    res.status(204).end();
}

export async function atualizarAdmin(req, res) {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const body = CreateSchema.partial().parse(req.body);

    if (body.data_publicacao) {
        const ymd = parseDdMmYyyyToDate(body.data_publicacao);
        if (!ymd) {
            return res.status(400).json({ error: { message: "data_publicacao inválida (dd/mm/aaaa).", requestId: req.id } });
        }
        body.data_publicacao = ymd;
    }

    // if file provided we need to update url as well
    if (req.file) {
        body.url = `/uploads/tutorials/${body.setor || req.body.setor}/${req.file.filename}`;
    }

    const item = await updateTutorial(id, {
        ...body,
        publicado_por_admin_id: req.user?.id,
        publicado_por_nome: req.user?.nome || null
    });

    if (!item) {
        return res.status(404).json({ error: { message: "Tutorial não encontrado.", requestId: req.id } });
    }

    res.json(item);
}