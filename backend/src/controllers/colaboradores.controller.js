import { z } from "zod";
import { parseDdMmYyyyToDate } from "../utils/date.js";
import {
    listColaboradores,
    getColaboradorByMatricula,
    createColaborador,
    updateColaboradorByMatricula,
    deleteColaboradorByMatricula
} from "../services/colaboradores.service.js";

const StatusEnum = z.enum(["ATIVO", "INATIVO"]);

const MatriculaSchema = z
    .string()
    .min(1)
    .max(30)
    .regex(/^[A-Za-z0-9._-]+$/, "Matrícula deve ser alfanumérica (com . _ -).");

const CreateSchema = z.object({
    matricula: MatriculaSchema,
    nome_completo: z.string().min(3).max(150),
    data_nascimento: z.string().min(10).max(10), // dd/mm/aaaa
    status: StatusEnum.optional().default("ATIVO")
});

const UpdateSchema = z.object({
    nome_completo: z.string().min(3).max(150),
    data_nascimento: z.string().min(10).max(10),
    status: StatusEnum
});

const ListQuerySchema = z.object({
    status: StatusEnum.optional(),
    search: z.string().trim().min(1).max(50).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const DeleteConfirmSchema = z.object({
    confirm: z.string().min(1).max(100)
});

export async function listar(req, res) {
    const q = ListQuerySchema.parse(req.query);
    const data = await listColaboradores(q);
    res.json(data);
}

export async function obter(req, res) {
    const matricula = MatriculaSchema.parse(req.params.matricula);
    const colab = await getColaboradorByMatricula(matricula);
    if (!colab) {
        return res.status(404).json({
            error: { message: "Colaborador não encontrado.", requestId: req.id }
        });
    }
    res.json(colab);
}

export async function criar(req, res) {
    const body = CreateSchema.parse(req.body);

    const ymd = parseDdMmYyyyToDate(body.data_nascimento);
    if (!ymd) {
        return res.status(400).json({
            error: { message: "Data de nascimento inválida. Use dd/mm/aaaa.", requestId: req.id }
        });
    }

    try {
        const created = await createColaborador({
            matricula: body.matricula,
            nome_completo: body.nome_completo.trim(),
            data_nascimento_ymd: ymd,
            status: body.status,
            adminId: Number(req.user.id)
        });

        return res.status(201).json(created);
    } catch (err) {
        // Duplicidade de matrícula
        if (err && err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: { message: "Matrícula já cadastrada.", requestId: req.id }
            });
        }
        throw err;
    }
}

export async function atualizar(req, res) {
    const matricula = MatriculaSchema.parse(req.params.matricula);
    const body = UpdateSchema.parse(req.body);

    const ymd = parseDdMmYyyyToDate(body.data_nascimento);
    if (!ymd) {
        return res.status(400).json({
            error: { message: "Data de nascimento inválida. Use dd/mm/aaaa.", requestId: req.id }
        });
    }

    const updated = await updateColaboradorByMatricula({
        matricula,
        nome_completo: body.nome_completo.trim(),
        data_nascimento_ymd: ymd,
        status: body.status,
        adminId: Number(req.user.id)
    });

    if (!updated) {
        return res.status(404).json({
            error: { message: "Colaborador não encontrado.", requestId: req.id }
        });
    }

    return res.json(updated);
}

export async function excluir(req, res) {
    const matricula = MatriculaSchema.parse(req.params.matricula);
    const body = DeleteConfirmSchema.parse(req.body);

    // Confirmação por texto: exige "EXCLUIR <MATRICULA>"
    const expected = `EXCLUIR ${matricula}`.toUpperCase();
    if (body.confirm.trim().toUpperCase() !== expected) {
        return res.status(400).json({
            error: {
                message: `Confirmação inválida. Digite exatamente: ${expected}`,
                requestId: req.id
            }
        });
    }

    const ok = await deleteColaboradorByMatricula(matricula);
    if (!ok) {
        return res.status(404).json({
            error: { message: "Colaborador não encontrado.", requestId: req.id }
        });
    }

    // resposta mínima (não vaza dados)
    return res.status(204).send();
}
