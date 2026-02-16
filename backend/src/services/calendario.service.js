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

    console.log(`\n📊 === FERIADOS DO ANO ${ano} ===`);
    console.log(`Total: ${rows.length} feriado(s)`);
    rows.forEach(f => {
        console.log(`  📅 ${f.data} (${f.tipo}): ${f.nome} | Cor: ${f.cor_hex}`);
    });
    console.log(`=================================\n`);

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
    const { data, nome, descricao, tipo = 'CUSTOMIZADO', cor_hex, adminId, anoFeriado } = feriado;

    // Garantir que cor_hex é sempre válida
    const corValida = cor_hex && /^#[0-9A-F]{6}$/i.test(cor_hex) ? cor_hex : '#FF6B6B';

    console.log('🔧 createFeriado recebeu:', {
        data, nome, tipo, corValida, anoFeriado
    });

    // Inserir feriado
    const sqlInsert = `
        INSERT INTO CalendarioFeriados 
        (ano_feriado, data, nome, descricao, tipo, cor_hex, created_by_admin_id, updated_by_admin_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [resultInsert] = await pool.query(sqlInsert, [
        anoFeriado,
        data,
        nome,
        descricao || null,
        tipo,
        corValida,
        tipo === 'NACIONAL' ? null : adminId,
        tipo === 'NACIONAL' ? null : adminId
    ]);

    const novoId = resultInsert.insertId;
    console.log('✅ Feriado inserido com ID:', novoId);

    // Recuperar imediatamente o feriado criado
    const feriadoCriado = await getFeriadoById(novoId);

    console.log('📤 Feriado recuperado para retorno:', feriadoCriado);

    return feriadoCriado;
}

export async function updateFeriado(id, feriado, adminId, anoFeriado = null) {
    const { data, nome, descricao, cor_hex } = feriado;

    // Garantir que cor_hex é sempre válida se for fornecida
    const corValida = cor_hex && /^#[0-9A-F]{6}$/i.test(cor_hex) ? cor_hex : null;

    console.log('🔧 updateFeriado recebido:', {
        id, data, nome, corValida, anoFeriado
    });

    // Atualizar feriado
    const sqlUpdate = `
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

    const [resultUpdate] = await pool.query(sqlUpdate, [
        anoFeriado,
        data || null,
        nome || null,
        descricao || null,
        corValida,
        adminId,
        id
    ]);

    console.log('✅ Feriado atualizado, linhas afetadas:', resultUpdate.affectedRows);

    if (resultUpdate.affectedRows === 0) {
        return null;
    }

    // Recuperar imediatamente o feriado atualizado
    const feriadoAtualizado = await getFeriadoById(id);

    console.log('📤 Feriado recuperado para retorno:', feriadoAtualizado);

    return feriadoAtualizado;
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
