import { pool } from "../config/db.js";

export async function fetchRelatorioData({ fromYmd, toYmd }) {
    // 1) Top comunicados por visualização (no período)
    const [topRows] = await pool.query(
        `SELECT c.id, c.titulo, SUM(v.views_total) AS views
     FROM Comunicados c
     JOIN ComunicadoViewsDaily v ON v.comunicado_id = c.id
     WHERE v.dia BETWEEN :from AND :to
       AND c.status = 'PUBLICADO'
     GROUP BY c.id, c.titulo
     ORDER BY views DESC
     LIMIT 5`,
        { from: fromYmd, to: toYmd }
    );

    // 2) Acessos por semana (definido como GET /comunicados)
    const [accessRows] = await pool.query(
        `SELECT YEARWEEK(dia, 3) AS yearweek,
            MIN(dia) AS inicio,
            MAX(dia) AS fim,
            SUM(acessos_total) AS acessos
     FROM AcessosDaily
     WHERE dia BETWEEN :from AND :to
     GROUP BY yearweek
     ORDER BY yearweek ASC`,
        { from: fromYmd, to: toYmd }
    );

    // 3) Confirmações de leitura (somente críticos) no período
    // Base: comunicados críticos que “estão relevantes” no período (criados até o fim e não expirados antes do início)
    const [critRows] = await pool.query(
        `SELECT c.id, c.titulo,
            COUNT(r.id) AS confirmacoes
     FROM Comunicados c
     LEFT JOIN ComunicadoReadConfirmations r
       ON r.comunicado_id = c.id
      AND DATE(r.confirmed_at) BETWEEN :from AND :to
     WHERE c.status = 'PUBLICADO'
       AND c.importancia = 'IMPORTANTE'
       AND c.created_at <= CONCAT(:to, ' 23:59:59')
       AND c.expira_em >= :from
     GROUP BY c.id, c.titulo
     ORDER BY confirmacoes DESC
     LIMIT 10`,
        { from: fromYmd, to: toYmd }
    );

    const [colabCountRows] = await pool.query(
        `SELECT COUNT(*) AS total
     FROM Colaboradores
     WHERE status = 'ATIVO'`
    );
    const totalColabsAtivos = Number(colabCountRows?.[0]?.total || 0);

    // 4) Temas mais frequentes no “Fale com o RH”
    // Como essa feature será implementada depois, aqui vai uma leitura defensiva:
    // - Se a tabela ainda não existir, retorna vazio sem quebrar o relatório.
    // Importante: quando você criar o “Fale com o RH”, padronize:
    // tabela: FaleComRhMensagens (ou ajuste aqui)
    // colunas: tema (string padronizada), created_at
    let temasRows = [];
    try {
        const [rows] = await pool.query(
            `SELECT tema, COUNT(*) AS total
       FROM FaleComRhMensagens
       WHERE DATE(created_at) BETWEEN :from AND :to
       GROUP BY tema
       ORDER BY total DESC
       LIMIT 10`,
            { from: fromYmd, to: toYmd }
        );
        temasRows = rows;
    } catch (err) {
        // ER_NO_SUCH_TABLE: tabela ainda não existe
        if (err?.code !== "ER_NO_SUCH_TABLE") throw err;
        temasRows = [];
    }

    return {
        period: { from: fromYmd, to: toYmd },
        topComunicados: topRows.map((r) => ({ id: r.id, titulo: r.titulo, views: Number(r.views || 0) })),
        acessosSemana: accessRows.map((r) => ({
            yearweek: r.yearweek,
            inicio: r.inicio,
            fim: r.fim,
            acessos: Number(r.acessos || 0)
        })),
        confirmacoesCriticos: critRows.map((r) => ({
            id: r.id,
            titulo: r.titulo,
            confirmacoes: Number(r.confirmacoes || 0),
            percentual: totalColabsAtivos ? Number(r.confirmacoes || 0) / totalColabsAtivos : 0
        })),
        totalColabsAtivos,
        temasFaleRh: temasRows.map((r) => ({ tema: r.tema, total: Number(r.total || 0) }))
    };
}
