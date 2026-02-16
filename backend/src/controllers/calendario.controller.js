import { z } from "zod";
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
        const config = await getCalendarioConfiguracao();
        if (!config) {
            return res.status(404).json({
                error: { message: "Configuração de calendário não encontrada.", requestId: req.id }
            });
        }
        res.json(config);
    } catch (err) {
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

        console.log('🔍 Buscando feriados para o ano:', ano);

        const feriados = await getFeriadosByAno(ano);

        console.log('✅ Feriados encontrados:', feriados.map(f => ({
            id: f.id,
            data: f.data,
            nome: f.nome,
            cor_hex: f.cor_hex,
            tipo: f.tipo
        })));

        res.json({ feriados });
    } catch (err) {
        if (err instanceof z.ZodError) {
            console.error('❌ Erro de validação:', err.errors[0]);
            return res.status(400).json({
                error: { message: err.errors[0].message, requestId: req.id }
            });
        }
        console.error('❌ Erro ao listar feriados:', err);
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

        console.log('📝 Recebido pedido para criar feriado:', {
            data: body.data,
            nome: body.nome,
            cor_hex: body.cor_hex,
            descricao: body.descricao
        });

        // Extrair o ano da data (YYYY-MM-DD)
        const anoFeriado = parseInt(body.data.substring(0, 4), 10);

        // Verificar se já existe feriado na mesma data
        const jaExiste = await isFeriado(anoFeriado, body.data);
        if (jaExiste) {
            console.warn('⚠️  Feriado já existe na data:', body.data);
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

        console.log('✅ Feriado criado com sucesso na resposta:', {
            id: feriado.id,
            data: feriado.data,
            cor_hex: feriado.cor_hex
        });

        res.status(201).json(feriado);
    } catch (err) {
        if (err instanceof z.ZodError) {
            console.error('❌ Erro de validação:', err.errors[0]);
            return res.status(400).json({
                error: { message: err.errors[0].message, requestId: req.id }
            });
        }
        console.error('❌ Erro ao criar feriado:', err);
        res.status(500).json({
            error: { message: "Erro ao criar feriado.", requestId: req.id }
        });
    }
}

export async function atualizarFeriado(req, res) {
    try {
        const id = z.coerce.number().int().positive().parse(req.params.id);
        const body = FeriadoSchema.partial().parse(req.body);

        console.log('📝 Recebido pedido para atualizar feriado:', {
            id,
            data: body.data,
            nome: body.nome,
            cor_hex: body.cor_hex
        });

        const feriado = await getFeriadoById(id);
        if (!feriado) {
            console.warn('⚠️  Feriado não encontrado:', id);
            return res.status(404).json({
                error: { message: "Feriado não encontrado.", requestId: req.id }
            });
        }

        if (feriado.tipo === 'NACIONAL') {
            console.warn('⚠️  Tentativa de editar feriado nacional:', id);
            return res.status(403).json({
                error: { message: "Não é permitido editar feriados nacionais.", requestId: req.id }
            });
        }

        // Validar se outra data já existe (se mudando de data)
        if (body.data && body.data !== feriado.data) {
            const novoAno = parseInt(body.data.substring(0, 4), 10);
            const jaExiste = await isFeriado(novoAno, body.data);
            if (jaExiste) {
                console.warn('⚠️  Feriado já existe na nova data:', body.data);
                return res.status(409).json({
                    error: { message: "Já existe um feriado nesta data.", requestId: req.id }
                });
            }
        }

        const updated = await updateFeriado(id, body, Number(req.user.id));
        if (!updated) {
            console.error('❌ Falha ao atualizar feriado:', id);
            return res.status(400).json({
                error: { message: "Falha ao atualizar feriado.", requestId: req.id }
            });
        }

        console.log('✅ Feriado atualizado com sucesso na resposta:', {
            id: updated.id,
            data: updated.data,
            cor_hex: updated.cor_hex
        });

        res.json(updated);
    } catch (err) {
        if (err instanceof z.ZodError) {
            console.error('❌ Erro de validação:', err.errors[0]);
            return res.status(400).json({
                error: { message: err.errors[0].message, requestId: req.id }
            });
        }
        console.error('❌ Erro ao atualizar feriado:', err);
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
