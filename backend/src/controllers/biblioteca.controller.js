import { z } from "zod";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import mime from "mime-types";

import {
    createPasta,
    listPastas,
    getPastaById,
    deletePastaById,
    createDocumento,
    listDocumentosByPasta,
    getDocumentoById,
    deleteDocumentoById
} from "../services/biblioteca.service.js";

import { normalizeFolderName, normalizeDocName, toSlug } from "../utils/normalize.js";

const CreatePastaSchema = z.object({
    nome: z.string().min(3).max(120)
});

const PastaIdSchema = z.coerce.number().int().positive();

const CreateDocSchema = z.object({
    nome: z.string().min(3).max(160)
});

const DocIdSchema = z.coerce.number().int().positive();

function sha256File(filePath) {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    return new Promise((resolve, reject) => {
        stream.on("data", (d) => hash.update(d));
        stream.on("error", reject);
        stream.on("end", () => resolve(hash.digest("hex")));
    });
}

export async function listarPastasPublico(req, res) {
    const items = await listPastas();
    res.json(items);
}

export async function listarDocumentosPublico(req, res) {
    const pastaId = PastaIdSchema.parse(req.params.pastaId);
    const pasta = await getPastaById(pastaId);
    if (!pasta) {
        return res.status(404).json({ error: { message: "Pasta não encontrada.", requestId: req.id } });
    }
    const docs = await listDocumentosByPasta(pastaId);
    res.json({ pasta, items: docs });
}

/* =========================
   ADMIN: criar pasta
========================= */
export async function criarPasta(req, res) {
    const body = CreatePastaSchema.parse(req.body);

    const normalized = normalizeFolderName(body.nome);
    if (!normalized) {
        return res.status(400).json({
            error: { message: "Nome de pasta inválido. Use apenas A-Z, 0-9, espaço, _ ou -, sempre em maiúsculo.", requestId: req.id }
        });
    }

    const slug = toSlug(normalized);

    try {
        const pasta = await createPasta({ nome: normalized, slug, adminId: Number(req.user.id) });
        res.status(201).json(pasta);
    } catch (err) {
        if (err?.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: { message: "Nome de pasta já existe.", requestId: req.id }
            });
        }
        throw err;
    }
}

/* =========================
   ADMIN: upload documento PDF
========================= */
export async function adicionarDocumento(req, res) {
    const pastaId = PastaIdSchema.parse(req.params.pastaId);
    const body = CreateDocSchema.parse(req.body);

    const pasta = await getPastaById(pastaId);
    if (!pasta) {
        return res.status(404).json({ error: { message: "Pasta não encontrada.", requestId: req.id } });
    }

    const normalizedName = normalizeDocName(body.nome);
    if (!normalizedName) {
        return res.status(400).json({
            error: { message: "Nome do documento inválido. Sem caracteres especiais.", requestId: req.id }
        });
    }

    if (!req.file) {
        return res.status(400).json({
            error: { message: "Arquivo é obrigatório (field: file).", requestId: req.id }
        });
    }

    // valida PDF
    const mimeType = req.file.mimetype;
    if (mimeType !== "application/pdf") {
        // apaga arquivo físico
        try { fs.unlinkSync(req.file.path); } catch { }
        return res.status(400).json({
            error: { message: "Extensão/mime inválido. Apenas PDF.", requestId: req.id }
        });
    }

    const slug = toSlug(normalizedName.endsWith(".PDF") ? normalizedName.slice(0, -4) : normalizedName);
    const fileHash = await sha256File(req.file.path);

    // Move para: uploads/library/<pastaSlug>/<uuid>.pdf
    const destDir = path.join(process.cwd(), "uploads", "library", pasta.slug);
    fs.mkdirSync(destDir, { recursive: true });

    const finalName = `${crypto.randomUUID()}.pdf`;
    const finalPath = path.join(destDir, finalName);

    fs.renameSync(req.file.path, finalPath);

    try {
        const doc = await createDocumento({
            pastaId,
            nome: normalizedName.endsWith(".PDF") ? normalizedName : `${normalizedName}.PDF`,
            slug,
            filePath: finalPath,
            fileSize: req.file.size,
            fileHash,
            mimeType,
            adminId: Number(req.user.id)
        });

        res.status(201).json(doc);
    } catch (err) {
        // Se duplicar nome na mesma pasta, remove arquivo físico
        try { fs.unlinkSync(finalPath); } catch { }

        if (err?.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: { message: "Documento com esse nome já existe nesta pasta.", requestId: req.id }
            });
        }
        throw err;
    }
}

/* =========================
   PÚBLICO: download por streaming (Range)
========================= */
export async function downloadDocumentoPublico(req, res) {
    const docId = DocIdSchema.parse(req.params.docId);
    const doc = await getDocumentoById(docId);

    if (!doc) {
        return res.status(404).json({ error: { message: "Documento não encontrado.", requestId: req.id } });
    }

    // Defensivo: garante que arquivo existe
    if (!fs.existsSync(doc.file_path)) {
        return res.status(410).json({ error: { message: "Arquivo indisponível.", requestId: req.id } });
    }

    const stat = fs.statSync(doc.file_path);
    const fileSize = stat.size;

    res.setHeader("Content-Type", doc.mime_type || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${doc.slug}.pdf"`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=604800"); // 7 dias

    const range = req.headers.range;

    // Suporte a Range para mobile (não baixa tudo de uma vez)
    if (range) {
        const m = /^bytes=(\d+)-(\d+)?$/.exec(range);
        if (!m) {
            return res.status(416).send();
        }
        const start = Number(m[1]);
        const end = m[2] ? Number(m[2]) : Math.min(start + 1024 * 1024 - 1, fileSize - 1); // chunk ~1MB

        if (start >= fileSize || end >= fileSize) {
            return res.status(416).send();
        }

        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
        res.setHeader("Content-Length", end - start + 1);

        return fs.createReadStream(doc.file_path, { start, end }).pipe(res);
    }

    res.setHeader("Content-Length", fileSize);
    return fs.createReadStream(doc.file_path).pipe(res);
}

/* =========================
   ADMIN: excluir documento definitivo
========================= */
export async function excluirDocumento(req, res) {
    const docId = DocIdSchema.parse(req.params.docId);
    const deleted = await deleteDocumentoById(docId);

    if (!deleted) {
        return res.status(404).json({ error: { message: "Documento não encontrado.", requestId: req.id } });
    }

    // remove arquivo físico
    try { fs.unlinkSync(deleted.file_path); } catch { }

    return res.status(204).send();
}
