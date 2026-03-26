import { pool } from "../config/db.js";
import { logger } from "../utils/logger.js";

export async function listarEventosPublicados(req, res) {
    try {
        const query = `
            SELECT 
                id,
                titulo,
                conteudo as descricao,
                publicado_em as data_inicio,
                publicado_em as data_fim,
                '' as local,
                imagem_url,
                foto_perfil,
                publicado_por_nome
            FROM Carrossel
            WHERE status = 'PUBLICADO'
            AND eh_evento = true
            ORDER BY publicado_em DESC
            LIMIT 100
        `;

        const [eventos] = await pool.query(query);
        return res.json({ eventos });
    } catch (erro) {
        logger.error("[erro] listarEventosPublicados:", erro);
        return res.status(500).json({ erro: "Erro ao listar eventos" });
    }
}

export async function obterEventoAtual(req, res) {
    try {
        const query = `
            SELECT 
                id,
                titulo,
                conteudo as descricao,
                publicado_em as data_inicio,
                publicado_em as data_fim,
                '' as local,
                imagem_url,
                foto_perfil,
                publicado_por_nome
            FROM Carrossel
            WHERE status = 'PUBLICADO'
            AND eh_evento = true
            ORDER BY publicado_em DESC
            LIMIT 1
        `;

        const [eventos] = await pool.query(query);
        if (eventos.length === 0) {
            return res.json({ evento: null });
        }
        return res.json({ evento: eventos[0] });
    } catch (erro) {
        logger.error("[erro] obterEventoAtual:", erro);
        return res.status(500).json({ erro: "Erro ao obter evento atual" });
    }
}

export async function listar(req, res) {
    try {
        const page = parseInt(req.query.page || "1");
        const pageSize = parseInt(req.query.pageSize || "20");
        const status = req.query.status || "PUBLICADO";

        const offset = (page - 1) * pageSize;

        let whereClause = "";
        const params = [];

        if (status && status !== "TODOS") {
            whereClause = "WHERE status = ?";
            params.push(status);
        }

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) as total FROM Eventos ${whereClause}`,
            params
        );

        const [eventos] = await pool.query(
            `
                SELECT 
                    id,
                    titulo,
                    descricao,
                    data_inicio,
                    data_fim,
                    local,
                    imagem_url,
                    status,
                    publicado_por_nome,
                    publicado_em,
                    created_at,
                    updated_at
                FROM Eventos
                ${whereClause}
                ORDER BY data_inicio DESC
                LIMIT ? OFFSET ?
            `,
            [...params, pageSize, offset]
        );

        res.json({
            items: eventos,
            total,
            page,
            pageSize,
        });
    } catch (erro) {
        logger.error("[erro] listar eventos:", erro);
        res.status(500).json({ erro: "Erro ao listar eventos" });
    }
}

export async function obter(req, res) {
    try {
        const { id } = req.params;

        const [eventos] = await pool.query(
            `
                SELECT 
                    id,
                    titulo,
                    conteudo as descricao,
                    publicado_em as data_inicio,
                    publicado_em as data_fim,
                    '' as local,
                    imagem_url,
                    foto_perfil,
                    status
                FROM Carrossel
                WHERE id = ?
                AND eh_evento = true
                AND status = 'PUBLICADO'
            `,
            [id]
        );

        if (eventos.length === 0) {
            return res.status(404).json({ erro: "Evento não encontrado" });
        }

        res.json(eventos[0]);
    } catch (erro) {
        logger.error("[erro] obter evento:", erro);
        res.status(500).json({ erro: "Erro ao obter evento" });
    }
}

export async function criar(req, res) {
    try {
        const { titulo, descricao, data_inicio, data_fim, local, imagem_url, status } = req.body;

        if (!titulo || !descricao || !data_inicio || !data_fim) {
            return res.status(400).json({ erro: "Campos obrigatórios faltando" });
        }

        const adminId = req.user?.id;
        const adminNome = req.user?.nome;

        const publicadoEm = status === "PUBLICADO" ? new Date() : null;

        const [result] = await db.query(
            `
                INSERT INTO Eventos (
                    titulo,
                    descricao,
                    data_inicio,
                    data_fim,
                    local,
                    imagem_url,
                    status,
                    publicado_por_admin_id,
                    publicado_por_nome,
                    publicado_em
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                titulo,
                descricao,
                data_inicio,
                data_fim,
                local || null,
                imagem_url || null,
                status || "RASCUNHO",
                adminId,
                adminNome,
                publicadoEm,
            ]
        );

        res.status(201).json({
            id: result.insertId,
            titulo,
            descricao,
            data_inicio,
            data_fim,
            local,
            imagem_url,
            status,
        });
    } catch (erro) {
        logger.error("[erro] criar evento:", erro);
        res.status(500).json({ erro: "Erro ao criar evento" });
    }
}

export async function atualizar(req, res) {
    try {
        const { id } = req.params;
        const { titulo, descricao, data_inicio, data_fim, local, imagem_url, status } = req.body;

        const [check] = await db.query(`SELECT id FROM Eventos WHERE id = ?`, [id]);

        if (check.length === 0) {
            return res.status(404).json({ erro: "Evento não encontrado" });
        }

        const updates = [];
        const values = [];

        if (titulo !== undefined) {
            updates.push("titulo = ?");
            values.push(titulo);
        }
        if (descricao !== undefined) {
            updates.push("descricao = ?");
            values.push(descricao);
        }
        if (data_inicio !== undefined) {
            updates.push("data_inicio = ?");
            values.push(data_inicio);
        }
        if (data_fim !== undefined) {
            updates.push("data_fim = ?");
            values.push(data_fim);
        }
        if (local !== undefined) {
            updates.push("local = ?");
            values.push(local);
        }
        if (imagem_url !== undefined) {
            updates.push("imagem_url = ?");
            values.push(imagem_url);
        }
        if (status !== undefined) {
            updates.push("status = ?");
            values.push(status);
            if (status === "PUBLICADO") {
                updates.push("publicado_em = NOW()");
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ erro: "Nenhum campo para atualizar" });
        }

        values.push(id);

        await db.query(
            `UPDATE Eventos SET ${updates.join(", ")} WHERE id = ?`,
            values
        );

        res.json({ mensagem: "Evento atualizado com sucesso" });
    } catch (erro) {
        logger.error("[erro] atualizar evento:", erro);
        res.status(500).json({ erro: "Erro ao atualizar evento" });
    }
}

export async function excluir(req, res) {
    try {
        const { id } = req.params;

        const [check] = await db.query(`SELECT id FROM Eventos WHERE id = ?`, [id]);

        if (check.length === 0) {
            return res.status(404).json({ erro: "Evento não encontrado" });
        }

        await db.query(`DELETE FROM Eventos WHERE id = ?`, [id]);

        res.json({ mensagem: "Evento excluído com sucesso" });
    } catch (erro) {
        logger.error("[erro] excluir evento:", erro);
        res.status(500).json({ erro: "Erro ao excluir evento" });
    }
}
