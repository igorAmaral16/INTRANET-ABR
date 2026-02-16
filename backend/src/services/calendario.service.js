import { pool } from "../config/db.js";

// ==================== CONFIGURAÇÃO CALENDÁRIO ====================

export async function getCalendarioConfiguracao() {
    const sql = `
        SELECT 
            id,
            ano_vigencia,
            mes_inicio,
            mes_fim,
            titulo,
            descricao,
            ativo,
            created_by_admin_id,
            updated_by_admin_id,
            created_at,
            updated_at
        FROM CalendarioConfiguracao
        WHERE ativo = 1
        ORDER BY ano_vigencia DESC
        LIMIT 1
    `;

    const [rows] = await pool.query(sql);
    return rows.length > 0 ? rows[0] : null;
}

export async function createCalendarioConfiguracao(config) {
    const {
        ano_vigencia = new Date().getFullYear(),
        mes_inicio = 1,
        mes_fim = 12,
        titulo,
        descricao,
        adminId
    } = config;

    // Desativa outras configurações do mesmo ano
    await pool.query(
        `UPDATE CalendarioConfiguracao SET ativo = 0 WHERE ano_vigencia = ?`,
        [ano_vigencia]
    );

    const sql = `
        INSERT INTO CalendarioConfiguracao 
        (ano_vigencia, mes_inicio, mes_fim, titulo, descricao, created_by_admin_id, updated_by_admin_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(sql, [
        ano_vigencia,
        mes_inicio,
        mes_fim,
        titulo || null,
        descricao || null,
        adminId,
        adminId
    ]);

    return {
        id: result.insertId,
        ano_vigencia,
        mes_inicio,
        mes_fim,
        titulo,
        descricao,
        ativo: 1,
        created_by_admin_id: adminId,
        updated_by_admin_id: adminId
    };
}

export async function updateCalendarioConfiguracao(id, config, adminId) {
    const { ano_vigencia, mes_inicio, mes_fim, titulo, descricao } = config;

    const sql = `
        UPDATE CalendarioConfiguracao
        SET 
            ano_vigencia = COALESCE(?, ano_vigencia),
            mes_inicio = COALESCE(?, mes_inicio),
            mes_fim = COALESCE(?, mes_fim),
            titulo = COALESCE(?, titulo),
            descricao = COALESCE(?, descricao),
            updated_by_admin_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    const [result] = await pool.query(sql, [
        ano_vigencia || null,
        mes_inicio || null,
        mes_fim || null,
        titulo || null,
        descricao || null,
        adminId,
        id
    ]);

    if (result.affectedRows === 0) {
        return null;
    }

    return await getCalendarioConfiguracaoById(id);
}

export async function getCalendarioConfiguracaoById(id) {
    const sql = `
        SELECT 
            id,
            ano_vigencia,
            mes_inicio,
            mes_fim,
            titulo,
            descricao,
            ativo,
            created_by_admin_id,
            updated_by_admin_id,
            created_at,
            updated_at
        FROM CalendarioConfiguracao
        WHERE id = ?
    `;

    const [rows] = await pool.query(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
}

// ==================== FERIADOS ====================

export async function getFeriadosByAno(ano) {
    const sql = `
        SELECT 
            id,
            ano_feriado,
            data,
            nome,
            descricao,
            tipo,
            cor_hex,
            created_by_admin_id,
            updated_by_admin_id,
            created_at,
            updated_at
        FROM CalendarioFeriados
        WHERE ano_feriado = ?
        ORDER BY data ASC
    `;

    const [rows] = await pool.query(sql, [ano]);
    return rows;
}

export async function getFeriadosByRange(dataInicio, dataFim) {
    const sql = `
        SELECT 
            id,
            ano_feriado,
            data,
            nome,
            descricao,
            tipo,
            cor_hex,
            created_by_admin_id,
            updated_by_admin_id,
            created_at,
            updated_at
        FROM CalendarioFeriados
        WHERE data BETWEEN ? AND ?
        ORDER BY data ASC
    `;

    const [rows] = await pool.query(sql, [dataInicio, dataFim]);
    return rows;
}

export async function getFeriadoById(id) {
    const sql = `
        SELECT 
            id,
            ano_feriado,
            data,
            nome,
            descricao,
            tipo,
            cor_hex,
            created_by_admin_id,
            updated_by_admin_id,
            created_at,
            updated_at
        FROM CalendarioFeriados
        WHERE id = ?
    `;

    const [rows] = await pool.query(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
}

export async function createFeriado(feriado) {
    const { data, nome, descricao, tipo = 'CUSTOMIZADO', cor_hex = '#FF6B6B', adminId, anoFeriado } = feriado;

    const sql = `
        INSERT INTO CalendarioFeriados 
        (ano_feriado, data, nome, descricao, tipo, cor_hex, created_by_admin_id, updated_by_admin_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(sql, [
        anoFeriado,
        data,
        nome,
        descricao || null,
        tipo,
        cor_hex,
        tipo === 'NACIONAL' ? null : adminId,
        tipo === 'NACIONAL' ? null : adminId
    ]);

    return {
        id: result.insertId,
        ano_feriado: anoFeriado,
        data,
        nome,
        descricao,
        tipo,
        cor_hex,
        created_by_admin_id: tipo === 'NACIONAL' ? null : adminId
    };
}

export async function updateFeriado(id, feriado, adminId, anoFeriado = null) {
    const { data, nome, descricao, cor_hex } = feriado;

    const sql = `
        UPDATE CalendarioFeriados
        SET 
            ano_feriado = COALESCE(?, ano_feriado),
            data = COALESCE(?, data),
            nome = COALESCE(?, nome),
            descricao = COALESCE(?, descricao),
            cor_hex = COALESCE(?, cor_hex),
            updated_by_admin_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND tipo = 'CUSTOMIZADO'
    `;

    const [result] = await pool.query(sql, [
        anoFeriado,
        data || null,
        nome || null,
        descricao || null,
        cor_hex || null,
        adminId,
        id
    ]);

    if (result.affectedRows === 0) {
        return null;
    }

    return await getFeriadoById(id);
}

export async function deleteFeriado(id) {
    const sql = `
        DELETE FROM CalendarioFeriados
        WHERE id = ? AND tipo = 'CUSTOMIZADO'
    `;

    const [result] = await pool.query(sql, [id]);
    return result.affectedRows > 0;
}

export async function isFeriado(ano, data) {
    const sql = `
        SELECT id FROM CalendarioFeriados
        WHERE ano_feriado = ? AND data = ?
        LIMIT 1
    `;

    const [rows] = await pool.query(sql, [ano, data]);
    return rows.length > 0;
}
