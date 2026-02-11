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

    // Total de views no período (todos comunicados publicados)
    const [totalViewsRows] = await pool.query(
        `SELECT COALESCE(SUM(v.views_total), 0) AS total_views
     FROM Comunicados c
     JOIN ComunicadoViewsDaily v ON v.comunicado_id = c.id
     WHERE v.dia BETWEEN :from AND :to
       AND c.status = 'PUBLICADO'`,
        { from: fromYmd, to: toYmd }
    );
    const totalViewsPeriod = Number(totalViewsRows?.[0]?.total_views || 0);

    // 2) Acessos por semana (datas já formatadas como YYYY-MM-DD para evitar Date->string gigante)
    const [accessRows] = await pool.query(
        `SELECT YEARWEEK(dia, 3) AS yearweek,
            DATE_FORMAT(MIN(dia), '%Y-%m-%d') AS inicio,
            DATE_FORMAT(MAX(dia), '%Y-%m-%d') AS fim,
            SUM(acessos_total) AS acessos
     FROM AcessosDaily
     WHERE dia BETWEEN :from AND :to
     GROUP BY yearweek
     ORDER BY yearweek ASC`,
        { from: fromYmd, to: toYmd }
    );

    // Total de acessos no período
    const [totalAcessosRows] = await pool.query(
        `SELECT COALESCE(SUM(acessos_total), 0) AS total_acessos
     FROM AcessosDaily
     WHERE dia BETWEEN :from AND :to`,
        { from: fromYmd, to: toYmd }
    );
    const totalAcessosPeriod = Number(totalAcessosRows?.[0]?.total_acessos || 0);

    // Total de comunicados publicados no período (criados no período)
    const [publishedPeriodRows] = await pool.query(
        `SELECT COUNT(*) AS total
     FROM Comunicados
     WHERE status = 'PUBLICADO'
       AND DATE(created_at) BETWEEN :from AND :to`,
        { from: fromYmd, to: toYmd }
    );
    const totalComunicadosPublicadosPeriodo = Number(publishedPeriodRows?.[0]?.total || 0);

    // 3) Confirmações de leitura (somente críticos) no período
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

    // Totais de críticos relevantes e confirmações no período
    const [critRelevantesRows] = await pool.query(
        `SELECT COUNT(*) AS total
     FROM Comunicados c
     WHERE c.status = 'PUBLICADO'
       AND c.importancia = 'IMPORTANTE'
       AND c.created_at <= CONCAT(:to, ' 23:59:59')
       AND c.expira_em >= :from`,
        { from: fromYmd, to: toYmd }
    );
    const totalCriticosRelevantes = Number(critRelevantesRows?.[0]?.total || 0);

    const [totalConfirmacoesCriticosRows] = await pool.query(
        `SELECT COUNT(r.id) AS total
     FROM Comunicados c
     JOIN ComunicadoReadConfirmations r
       ON r.comunicado_id = c.id
     WHERE c.status = 'PUBLICADO'
       AND c.importancia = 'IMPORTANTE'
       AND c.created_at <= CONCAT(:to, ' 23:59:59')
       AND c.expira_em >= :from
       AND DATE(r.confirmed_at) BETWEEN :from AND :to`,
        { from: fromYmd, to: toYmd }
    );
    const totalConfirmacoesCriticosPeriod = Number(totalConfirmacoesCriticosRows?.[0]?.total || 0);

    // 4) Categorias mais frequentes no "Fale com o RH"
    let temasRows = [];
    try {
        const [rows] = await pool.query(
            `SELECT categoria AS tema, COUNT(*) AS total
       FROM rh_conversations
       WHERE DATE(created_at) BETWEEN :from AND :to
       GROUP BY categoria
       ORDER BY total DESC
       LIMIT 10`,
            { from: fromYmd, to: toYmd }
        );
        temasRows = rows;
    } catch (err) {
        if (err?.code !== "ER_NO_SUCH_TABLE") throw err;
        temasRows = [];
    }

    return {
        period: { from: fromYmd, to: toYmd },

        kpis: {
            totalViewsPeriod,
            totalAcessosPeriod,
            totalComunicadosPublicadosPeriodo,
            totalCriticosRelevantes,
            totalConfirmacoesCriticosPeriod
        },

        topComunicados: topRows.map((r) => ({
            id: r.id,
            titulo: r.titulo,
            views: Number(r.views || 0)
        })),

        acessosSemana: accessRows.map((r) => ({
            yearweek: r.yearweek,
            inicio: r.inicio, // já string YYYY-MM-DD
            fim: r.fim,       // já string YYYY-MM-DD
            acessos: Number(r.acessos || 0)
        })),

        confirmacoesCriticos: critRows.map((r) => ({
            id: r.id,
            titulo: r.titulo,
            confirmacoes: Number(r.confirmacoes || 0),
            percentual: totalColabsAtivos ? Number(r.confirmacoes || 0) / totalColabsAtivos : 0
        })),

        totalColabsAtivos,

        temasFaleRh: temasRows.map((r) => ({
            tema: r.tema,
            total: Number(r.total || 0)
        }))
    };
}
