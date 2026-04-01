import { z } from "zod";
import { logger } from "../utils/logger.js";
import {
    getCalendarioConfiguracao,
    createCalendarioConfiguracao,
    updateCalendarioConfiguracao,
    getCalendarioConfiguracaoById,
    getFeriadosByAno,
    getFeriadosByRange,
    getFeriadoById,
    createFeriado,
    updateFeriado,
    deleteFeriado,
    isFeriado
} from "../services/calendario.service.js";

const SafeText = z
    .string()
    .trim()
    .min(1)
    .max(200)
    .refine((s) => !/[<>]/.test(s), "Caracteres inválidos.");

const DescricaoText = z
    .string()
    .trim()
    .max(5000)
    .optional()
    .refine((s) => !s || !/[<>]/.test(s), "Caracteres inválidos.");

const HexColorSchema = z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Cor deve estar no formato #RRGGBB.");

const DataSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD.")
    .refine((date) => !isNaN(Date.parse(date)), "Data inválida.");

const CalendarioConfSchema = z.object({
    ano_vigencia: z.coerce.number().int().min(2020).max(2100).optional(),
    mes_inicio: z.coerce.number().int().min(1).max(12).optional(),
    mes_fim: z.coerce.number().int().min(1).max(12).optional(),
    titulo: SafeText.optional(),
    descricao: DescricaoText
});

const FeriadoSchema = z.object({
    data: DataSchema,
    nome: SafeText,
    descricao: DescricaoText,
    cor_hex: HexColorSchema.optional()
});

export async function obterConfiguracao(req, res) {
    try {
        logger.debug({ requestId: req.id, ip: req.ip }, "Obtendo configuracao do calendario");
        const config = await getCalendarioConfiguracao();
        if (!config) {
            return res.status(404).json({
                error: { message: "Configuração de calendário não encontrada.", requestId: req.id }
            });
        }
        res.json(config);
    } catch (err) {
        logger.error({ requestId: req.id, error: err.message }, "Erro ao obter configuracao do calendario");
        res.status(500).json({
            error: { message: "Erro ao obter configuração.", requestId: req.id }
        });
    }
}

export async function criarConfiguracao(req, res) {
    try {
        const body = CalendarioConfSchema.parse(req.body);

        // Validar que mes_fim > mes_inicio se ambos forem fornecidos
        if (body.mes_inicio && body.mes_fim && body.mes_fim < body.mes_inicio) {
            return res.status(400).json({
                error: { message: "Mês de término deve ser maior ou igual ao mês de início.", requestId: req.id }
            });
        }

        const config = await createCalendarioConfiguracao({
            ...body,
            adminId: Number(req.user.id)
        });

        res.status(201).json(config);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({
                error: { message: err.errors[0].message, requestId: req.id }
            });
        }
        res.status(500).json({
            error: { message: "Erro ao criar configuração.", requestId: req.id }
        });
    }
}

export async function atualizarConfiguracao(req, res) {
    try {
        const id = z.coerce.number().int().positive().parse(req.params.id);
        const body = CalendarioConfSchema.parse(req.body);

        if (body.mes_inicio && body.mes_fim && body.mes_fim < body.mes_inicio) {
            return res.status(400).json({
                error: { message: "Mês de término deve ser maior ou igual ao mês de início.", requestId: req.id }
            });
        }

        const config = await updateCalendarioConfiguracao(
            id,
            body,
            Number(req.user.id)
        );

        if (!config) {
            return res.status(404).json({
                error: { message: "Configuração não encontrada.", requestId: req.id }
            });
        }

        res.json(config);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({
                error: { message: err.errors[0].message, requestId: req.id }
            });
        }
        res.status(500).json({
            error: { message: "Erro ao atualizar configuração.", requestId: req.id }
        });
    }
}

// ==================== FERIADOS ====================

export async function listarFeriadosPorAno(req, res) {
    try {
        const ano = z.coerce.number().int().min(2020).max(2100).parse(req.query.ano || new Date().getFullYear());

        logger.debug({ ano, requestId: req.id }, `Buscando feriados para o ano ${ano}`);

        const feriados = await getFeriadosByAno(ano);

        logger.info({ ano, count: feriados.length, requestId: req.id }, `Encontrados ${feriados.length} feriados para o ano ${ano}`);

        res.json({ feriados });
    } catch (err) {
        if (err instanceof z.ZodError) {
            logger.warn({ requestId: req.id, error: err.errors[0].message }, "Erro de validacao ao listar feriados");
            return res.status(400).json({
                error: { message: err.errors[0].message, requestId: req.id }
            });
        }
        logger.error({ requestId: req.id, error: err.message }, "Erro ao listar feriados");
        res.status(500).json({
            error: { message: "Erro ao listar feriados.", requestId: req.id }
        });
    }
}

export async function listarFeriadosPorRange(req, res) {
    try {
        const dataInicio = DataSchema.parse(req.query.data_inicio);
        const dataFim = DataSchema.parse(req.query.data_fim);

        if (dataFim < dataInicio) {
            return res.status(400).json({
                error: { message: "Data de término deve ser maior que data de início.", requestId: req.id }
            });
        }

        const feriados = await getFeriadosByRange(dataInicio, dataFim);
        res.json({ feriados });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({
                error: { message: err.errors[0].message, requestId: req.id }
            });
        }
        res.status(500).json({
            error: { message: "Erro ao listar feriados.", requestId: req.id }
        });
    }
}

export async function obterFeriado(req, res) {
    try {
        const id = z.coerce.number().int().positive().parse(req.params.id);

        const feriado = await getFeriadoById(id);
        if (!feriado) {
            return res.status(404).json({
                error: { message: "Feriado não encontrado.", requestId: req.id }
            });
        }

        res.json(feriado);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({
                error: { message: err.errors[0].message, requestId: req.id }
            });
        }
        res.status(500).json({
            error: { message: "Erro ao obter feriado.", requestId: req.id }
        });
    }
}

export async function criarFeriado(req, res) {
    try {
        // Validar corpo da requisição
        const body = FeriadoSchema.parse(req.body);

        logger.debug({ data: body.data, nome: body.nome, requestId: req.id }, "Recebido pedido para criar feriado");

        // Extrair o ano da data (YYYY-MM-DD)
        const anoFeriado = parseInt(body.data.substring(0, 4), 10);

        // Verificar se já existe feriado na mesma data
        const jaExiste = await isFeriado(anoFeriado, body.data);
        if (jaExiste) {
            logger.warn({ data: body.data, requestId: req.id }, "Tentativa de criar feriado em data que ja existe");
            return res.status(409).json({
                error: { message: "Já existe um feriado nesta data.", requestId: req.id }
            });
        }

        // Criar feriado com todas as informações
        const feriado = await createFeriado({
            ...body,
            anoFeriado,
            tipo: 'CUSTOMIZADO',
            adminId: Number(req.user.id)
        });

        logger.info({ id: feriado.id, data: feriado.data, user: req.user.id, requestId: req.id }, "Feriado criado com sucesso");

        res.status(201).json(feriado);
    } catch (err) {
        if (err instanceof z.ZodError) {
            logger.warn({ requestId: req.id, error: err.errors[0].message }, "Erro de validacao ao criar feriado");
            return res.status(400).json({
                error: { message: err.errors[0].message, requestId: req.id }
            });
        }
        logger.error({ requestId: req.id, error: err.message }, "Erro ao criar feriado");
        res.status(500).json({
            error: { message: "Erro ao criar feriado.", requestId: req.id }
        });
    }
}

export async function atualizarFeriado(req, res) {
    try {
        const id = z.coerce.number().int().positive().parse(req.params.id);
        const body = FeriadoSchema.partial().parse(req.body);

        logger.debug({ id, data: body.data, requestId: req.id }, "Recebido pedido para atualizar feriado");

        const feriado = await getFeriadoById(id);
        if (!feriado) {
            logger.warn({ id, requestId: req.id }, "Tentativa de atualizar feriado nao encontrado");
            return res.status(404).json({
                error: { message: "Feriado não encontrado.", requestId: req.id }
            });
        }

        if (feriado.tipo === 'NACIONAL') {
            logger.warn({ id, requestId: req.id }, "Tentativa de editar feriado nacional");
            return res.status(403).json({
                error: { message: "Não é permitido editar feriados nacionais.", requestId: req.id }
            });
        }

        // Validar se outra data já existe (se mudando de data)
        if (body.data && body.data !== feriado.data) {
            const novoAno = parseInt(body.data.substring(0, 4), 10);
            const jaExiste = await isFeriado(novoAno, body.data);
            if (jaExiste) {
                logger.warn({ id, newData: body.data, requestId: req.id }, "Feriado ja existe na nova data");
                return res.status(409).json({
                    error: { message: "Já existe um feriado nesta data.", requestId: req.id }
                });
            }
        }

        const updated = await updateFeriado(id, body, Number(req.user.id));
        if (!updated) {
            logger.error({ id, requestId: req.id }, "Falha ao atualizar feriado");
            return res.status(400).json({
                error: { message: "Falha ao atualizar feriado.", requestId: req.id }
            });
        }

        logger.info({ id: updated.id, data: updated.data, user: req.user.id, requestId: req.id }, "Feriado atualizado com sucesso");

        res.json(updated);
    } catch (err) {
        if (err instanceof z.ZodError) {
            logger.warn({ requestId: req.id, error: err.errors[0].message }, "Erro de validacao ao atualizar feriado");
            return res.status(400).json({
                error: { message: err.errors[0].message, requestId: req.id }
            });
        }
        logger.error({ requestId: req.id, error: err.message }, "Erro ao atualizar feriado");
        res.status(500).json({
            error: { message: "Erro ao atualizar feriado.", requestId: req.id }
        });
    }
}

export async function excluirFeriado(req, res) {
    try {
        const id = z.coerce.number().int().positive().parse(req.params.id);

        const feriado = await getFeriadoById(id);
        if (!feriado) {
            return res.status(404).json({
                error: { message: "Feriado não encontrado.", requestId: req.id }
            });
        }

        if (feriado.tipo === 'NACIONAL') {
            return res.status(403).json({
                error: { message: "Não é permitido excluir feriados nacionais.", requestId: req.id }
            });
        }

        const deletado = await deleteFeriado(id);
        if (!deletado) {
            return res.status(400).json({
                error: { message: "Falha ao excluir feriado.", requestId: req.id }
            });
        }

        res.status(204).send();
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({
                error: { message: err.errors[0].message, requestId: req.id }
            });
        }
        res.status(500).json({
            error: { message: "Erro ao excluir feriado.", requestId: req.id }
        });
    }
}
