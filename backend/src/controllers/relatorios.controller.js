import { z } from "zod";
import PDFDocument from "pdfkit";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

import { fetchRelatorioData } from "../services/relatorios.service.js";

const THEME = {
    colors: {
        primary: "#0B2F5B",
        primary2: "#123B6D",
        accent: "#2D9CDB",
        success: "#27AE60",
        warning: "#F2C94C",
        danger: "#EB5757",
        text: "#111827",
        muted: "#6B7280",
        border: "#E5E7EB",
        card: "#FFFFFF"
    }
};

function ymdToday() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function ymdDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function formatInt(n) {
    return new Intl.NumberFormat("pt-BR").format(Number(n || 0));
}

function formatPct01(x) {
    const v = Number(x || 0) * 100;
    return `${v.toFixed(1).replace(".", ",")}%`;
}

function safeOneLine(s, max = 90) {
    const t = String(s || "").replace(/\s+/g, " ").trim();
    if (t.length <= max) return t;
    return t.slice(0, Math.max(0, max - 1)) + "…";
}

function ymdToBr(ymd) {
    // espera YYYY-MM-DD
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ""));
    if (!m) return String(ymd || "");
    return `${m[3]}/${m[2]}`;
}

function rangeToShort(inicioYmd, fimYmd) {
    return `${ymdToBr(inicioYmd)}–${ymdToBr(fimYmd)}`;
}

const QuerySchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

function createChartRenderer() {
    return new ChartJSNodeCanvas({
        width: 1100,
        height: 560,
        backgroundColour: "#FFFFFF"
    });
}

async function renderChartPng(chartCanvas, config) {
    return chartCanvas.renderToBuffer(config, "image/png");
}

function docPageMetrics(doc) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const marginLeft = doc.page.margins.left;
    const marginRight = doc.page.margins.right;
    const marginTop = doc.page.margins.top;
    const marginBottom = doc.page.margins.bottom;
    const contentWidth = pageWidth - marginLeft - marginRight;
    const contentHeight = pageHeight - marginTop - marginBottom;
    return { pageWidth, pageHeight, marginLeft, marginRight, marginTop, marginBottom, contentWidth, contentHeight };
}

function drawCard(doc, { x, y, w, h }) {
    doc.save();
    doc.fillColor(THEME.colors.card).strokeColor(THEME.colors.border).lineWidth(1);
    doc.roundedRect(x, y, w, h, 10).fillAndStroke();
    doc.restore();
}

function drawSectionTitle(doc, title, subtitle) {
    doc.fillColor(THEME.colors.text).font("Helvetica-Bold").fontSize(14).text(title);
    if (subtitle) {
        doc.moveDown(0.2);
        doc.fillColor(THEME.colors.muted).font("Helvetica").fontSize(10).text(subtitle);
    }
    doc.moveDown(0.8);
}

function drawTable(doc, { x, y, w, columns, rows, rowHeight = 18 }) {
    const headerH = 22;

    doc.save();
    doc.fillColor(THEME.colors.primary2);
    doc.roundedRect(x, y, w, headerH, 8).fill();
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);

    let cx = x;
    for (const col of columns) {
        doc.text(col.header, cx + 8, y + 6, { width: col.width - 12, align: col.align || "left" });
        cx += col.width;
    }
    doc.restore();

    let cy = y + headerH;
    doc.font("Helvetica").fontSize(9);

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const isAlt = i % 2 === 1;

        doc.save();
        doc.fillColor(isAlt ? "#FAFBFD" : "#FFFFFF");
        doc.rect(x, cy, w, rowHeight).fill();
        doc.strokeColor(THEME.colors.border).lineWidth(0.5);
        doc.moveTo(x, cy + rowHeight).lineTo(x + w, cy + rowHeight).stroke();
        doc.restore();

        let cc = x;
        for (const col of columns) {
            const raw = row[col.key];
            const text = col.format ? col.format(raw, row) : String(raw ?? "");
            doc.fillColor(THEME.colors.text).text(text, cc + 8, cy + 5, {
                width: col.width - 12,
                align: col.align || "left",
                ellipsis: true
            });
            cc += col.width;
        }

        cy += rowHeight;
    }

    return cy;
}

function drawKpiCard(doc, { x, y, w, h, label, value, hint, color }) {
    drawCard(doc, { x, y, w, h });

    // Faixa lateral
    doc.save();
    doc.fillColor(color || THEME.colors.accent);
    doc.roundedRect(x, y, 8, h, 10).fill();
    doc.restore();

    // Label
    doc.fillColor(THEME.colors.muted).font("Helvetica").fontSize(9).text(safeOneLine(label, 46), x + 14, y + 10, {
        width: w - 28
    });

    // Valor
    doc.fillColor(THEME.colors.text).font("Helvetica-Bold").fontSize(16).text(String(value), x + 14, y + 28, {
        width: w - 28
    });

    // Hint (forçado para 1 linha para evitar sobreposição)
    if (hint) {
        doc.fillColor(THEME.colors.muted).font("Helvetica").fontSize(8).text(safeOneLine(hint, 70), x + 14, y + 52, {
            width: w - 28
        });
    }
}

async function loadLogoPngBuffer() {
    const configured = process.env.REPORT_LOGO_PATH;
    const defaultPath = path.join(process.cwd(), "src", "assets", "logo.webp");
    const logoPath = configured || defaultPath;

    try {
        const input = await fs.readFile(logoPath);
        const png = await sharp(input).png({ quality: 90 }).toBuffer();
        return png;
    } catch {
        return null; // se não existir, não quebra relatório
    }
}

function drawTopHeader(doc, { title, subtitle, rightText, logoPng }) {
    const { marginLeft, marginTop, contentWidth } = docPageMetrics(doc);

    const headerH = 76;
    const x = marginLeft;
    const y = marginTop - 10;
    const w = contentWidth;

    doc.save();
    doc.fillColor(THEME.colors.primary);
    doc.roundedRect(x, y, w, headerH, 10).fill();
    doc.fillColor(THEME.colors.accent);
    doc.roundedRect(x, y + headerH - 10, w, 10, 10).fill();
    doc.restore();

    // Logo dentro do header (canto esquerdo)
    const leftPad = 16;
    let textX = x + leftPad;
    const textTop = y + 14;

    if (logoPng) {
        const logoH = 26;
        const logoW = 26;
        const logoY = y + 16;
        const logoX = x + 16;
        doc.image(logoPng, logoX, logoY, { width: logoW, height: logoH });
        textX = logoX + logoW + 10;
    }

    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(16).text(title, textX, textTop, {
        width: w - (textX - x) - 120
    });

    doc.fillColor("#EAF2FF").font("Helvetica").fontSize(10).text(subtitle, textX, y + 40, {
        width: w - (textX - x) - 120
    });

    if (rightText) {
        doc.fillColor("#D7E6FF").font("Helvetica").fontSize(9).text(rightText, x, y + 18, {
            width: w - 16,
            align: "right"
        });
    }

    doc.y = y + headerH + 18;
}

function drawFooterSafe(doc, { pageNumber, totalPages, leftText }) {
    const { pageHeight, marginLeft, marginBottom, contentWidth } = docPageMetrics(doc);

    // IMPORTANTE: desenhar DENTRO da área segura (<= pageHeight - marginBottom)
    const footerY = pageHeight - marginBottom - 18;

    doc.save();
    doc.strokeColor(THEME.colors.border).lineWidth(1);
    doc.moveTo(marginLeft, footerY - 6).lineTo(marginLeft + contentWidth, footerY - 6).stroke();

    doc.fillColor(THEME.colors.muted).font("Helvetica").fontSize(8);

    // lineBreak:false evita o PDFKit tentar “fluir” para uma nova página
    doc.text(leftText, marginLeft, footerY, { width: contentWidth, align: "left", lineBreak: false });
    doc.text(`Página ${pageNumber} de ${totalPages}`, marginLeft, footerY, { width: contentWidth, align: "right", lineBreak: false });

    doc.restore();
}

function computeInsights(data) {
    const topCom = data.topComunicados?.[0];
    const topComText = topCom ? `${safeOneLine(topCom.titulo, 38)} (${formatInt(topCom.views)} views)` : "—";

    let maxWeek = null;
    for (const w of data.acessosSemana || []) {
        if (!maxWeek || w.acessos > maxWeek.acessos) maxWeek = w;
    }
    const peakWeekText = maxWeek ? `${rangeToShort(maxWeek.inicio, maxWeek.fim)} (${formatInt(maxWeek.acessos)})` : "—";

    const weeksCount = (data.acessosSemana || []).length || 0;
    const avgWeek = weeksCount ? Math.round((data.kpis.totalAcessosPeriod || 0) / weeksCount) : 0;

    const confirmRate = data.totalColabsAtivos
        ? (data.kpis.totalConfirmacoesCriticosPeriod || 0) / data.totalColabsAtivos
        : 0;

    const topTema = data.temasFaleRh?.[0]
        ? `${safeOneLine(data.temasFaleRh[0].tema, 32)} (${formatInt(data.temasFaleRh[0].total)})`
        : "—";

    return { topComText, peakWeekText, avgWeek, confirmRate, topTema };
}

function allZero(items) {
    return (items || []).length > 0 && (items || []).every((x) => Number(x.value || 0) === 0);
}

export async function gerarRelatorioPdf(req, res) {
    const q = QuerySchema.parse(req.query);
    const from = q.from || ymdDaysAgo(28);
    const to = q.to || ymdToday();

    if (from > to) {
        return res.status(400).json({
            error: { message: "Período inválido: 'from' deve ser <= 'to'.", requestId: req.id }
        });
    }

    const data = await fetchRelatorioData({ fromYmd: from, toYmd: to });
    const insights = computeInsights(data);

    const logoPng = await loadLogoPngBuffer();

    // Texto do rodapé reduzido e sem timezone gigante
    const now = new Date();
    const nowStr = now.toLocaleString("pt-BR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
    const footerLeft = `Gerado em ${nowStr} • Usuário: ${req.user?.username || "ADMIN"} • Período: ${data.period.from} a ${data.period.to}`;

    // Charts
    const chartCanvas = createChartRenderer();

    const topItems = (data.topComunicados || []).map((x) => ({
        label: safeOneLine(x.titulo, 24),
        value: Number(x.views || 0)
    }));

    const weekItems = (data.acessosSemana || []).map((w) => ({
        label: rangeToShort(w.inicio, w.fim),
        value: Number(w.acessos || 0)
    }));

    const critItems = (data.confirmacoesCriticos || []).map((c) => ({
        label: safeOneLine(c.titulo, 28),
        value: Number(c.confirmacoes || 0)
    }));

    const temaItems = (data.temasFaleRh || []).slice(0, 8).map((t) => ({
        label: safeOneLine(t.tema, 22),
        value: Number(t.total || 0)
    }));

    const topChartPng = topItems.length
        ? await renderChartPng(chartCanvas, {
            type: "bar",
            data: {
                labels: topItems.map((i) => i.label),
                datasets: [
                    {
                        label: "Views",
                        data: topItems.map((i) => i.value),
                        backgroundColor: "rgba(45, 156, 219, 0.70)",
                        borderColor: "rgba(45, 156, 219, 1)",
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: "Comunicados mais visualizados (Top 5)", color: "#111827", font: { size: 16, weight: "600" } }
                },
                scales: {
                    x: { ticks: { color: "#374151", maxRotation: 0, minRotation: 0 } },
                    y: { ticks: { color: "#374151" }, beginAtZero: true }
                }
            }
        })
        : null;

    const acessosChartPng = weekItems.length
        ? await renderChartPng(chartCanvas, {
            type: "line",
            data: {
                labels: weekItems.map((i) => i.label),
                datasets: [
                    {
                        label: "Acessos",
                        data: weekItems.map((i) => i.value),
                        borderColor: "rgba(39, 174, 96, 1)",
                        backgroundColor: "rgba(39, 174, 96, 0.12)",
                        fill: true,
                        tension: 0.25,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: "Acessos por semana", color: "#111827", font: { size: 16, weight: "600" } }
                },
                scales: {
                    x: { ticks: { color: "#374151", maxRotation: 0, minRotation: 0 } },
                    y: { ticks: { color: "#374151" }, beginAtZero: true }
                }
            }
        })
        : null;

    // Se todos valores forem 0, melhor mostrar “sem confirmações” do que um gráfico “vazio”
    const hasCritChart = critItems.length && !allZero(critItems);

    const critChartPng = hasCritChart
        ? await renderChartPng(chartCanvas, {
            type: "bar",
            data: {
                labels: critItems.map((i) => i.label),
                datasets: [
                    {
                        label: "Confirmações",
                        data: critItems.map((i) => i.value),
                        backgroundColor: "rgba(242, 201, 76, 0.80)",
                        borderColor: "rgba(242, 201, 76, 1)",
                        borderWidth: 1
                    }
                ]
            },
            options: {
                indexAxis: "y",
                responsive: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: "Confirmações de leitura (críticos)", color: "#111827", font: { size: 16, weight: "600" } }
                },
                scales: {
                    x: { ticks: { color: "#374151" }, beginAtZero: true },
                    y: { ticks: { color: "#374151" } }
                }
            }
        })
        : null;

    const temasChartPng = temaItems.length
        ? await renderChartPng(chartCanvas, {
            type: "doughnut",
            data: {
                labels: temaItems.map((i) => i.label),
                datasets: [
                    {
                        data: temaItems.map((i) => i.value),
                        backgroundColor: [
                            "rgba(45, 156, 219, 0.78)",
                            "rgba(39, 174, 96, 0.78)",
                            "rgba(242, 201, 76, 0.78)",
                            "rgba(235, 87, 87, 0.78)",
                            "rgba(111, 66, 193, 0.78)",
                            "rgba(246, 109, 155, 0.78)",
                            "rgba(47, 128, 237, 0.78)",
                            "rgba(242, 153, 74, 0.78)"
                        ],
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: false,
                plugins: {
                    legend: { position: "right", labels: { color: "#374151" } },
                    title: { display: true, text: "Temas mais frequentes — Fale com o RH", color: "#111827", font: { size: 16, weight: "600" } }
                }
            }
        })
        : null;

    // PDF com bufferPages para inserir rodapé “Página X de Y”
    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));

    // ========= PÁGINA 1 =========
    drawTopHeader(doc, {
        title: "Relatório Gerencial — Intranet",
        subtitle: "Visão executiva • Indicadores • Engajamento e Comunicação Interna",
        rightText: `Período\n${data.period.from} a ${data.period.to}`,
        logoPng
    });

    const { marginLeft, contentWidth } = docPageMetrics(doc);

    const kpiH = 86; // mais alto para evitar aperto
    const gap = 10;

    // Linha 1: 3 KPIs
    const kpiW = (contentWidth - gap * 2) / 3;
    const yKpi1 = doc.y;

    drawKpiCard(doc, {
        x: marginLeft,
        y: yKpi1,
        w: kpiW,
        h: kpiH,
        label: "Views no período (publicados)",
        value: formatInt(data.kpis.totalViewsPeriod),
        hint: `Top comunicado: ${insights.topComText}`,
        color: THEME.colors.accent
    });

    drawKpiCard(doc, {
        x: marginLeft + kpiW + gap,
        y: yKpi1,
        w: kpiW,
        h: kpiH,
        label: "Acessos no período (/comunicados)",
        value: formatInt(data.kpis.totalAcessosPeriod),
        hint: `Média semanal: ${formatInt(insights.avgWeek)} • Pico: ${insights.peakWeekText}`,
        color: THEME.colors.success
    });

    drawKpiCard(doc, {
        x: marginLeft + (kpiW + gap) * 2,
        y: yKpi1,
        w: kpiW,
        h: kpiH,
        label: "Comunicados publicados (no período)",
        value: formatInt(data.kpis.totalComunicadosPublicadosPeriodo),
        hint: `Base ativos: ${formatInt(data.totalColabsAtivos)}`,
        color: THEME.colors.primary2
    });

    // Linha 2: 2 KPIs
    const yKpi2 = yKpi1 + kpiH + 12;
    const kpiW2 = (contentWidth - gap) / 2;

    drawKpiCard(doc, {
        x: marginLeft,
        y: yKpi2,
        w: kpiW2,
        h: kpiH,
        label: "Críticos relevantes no período",
        value: formatInt(data.kpis.totalCriticosRelevantes),
        hint: "IMPORTANTES publicados e ativos no intervalo",
        color: THEME.colors.warning
    });

    drawKpiCard(doc, {
        x: marginLeft + kpiW2 + gap,
        y: yKpi2,
        w: kpiW2,
        h: kpiH,
        label: "Confirmações de leitura (críticos)",
        value: formatInt(data.kpis.totalConfirmacoesCriticosPeriod),
        hint: `Taxa vs. ativos: ${formatPct01(insights.confirmRate)} • Top tema RH: ${insights.topTema}`,
        color: THEME.colors.danger
    });

    // Sumário executivo (card)
    const ySummary = yKpi2 + kpiH + 16;
    const summaryH = 160;
    drawCard(doc, { x: marginLeft, y: ySummary, w: contentWidth, h: summaryH });

    doc.fillColor(THEME.colors.text).font("Helvetica-Bold").fontSize(12).text("Sumário executivo", marginLeft + 16, ySummary + 14);

    const bullets = [
        `Maior comunicado (views): ${insights.topComText}`,
        `Acessos totais: ${formatInt(data.kpis.totalAcessosPeriod)} (média semanal ${formatInt(insights.avgWeek)}; pico ${insights.peakWeekText})`,
        `Críticos relevantes: ${formatInt(data.kpis.totalCriticosRelevantes)} • Confirmações: ${formatInt(data.kpis.totalConfirmacoesCriticosPeriod)} (taxa ${formatPct01(insights.confirmRate)})`,
        temaItems.length ? `Fale com o RH — tema mais frequente: ${insights.topTema}` : `Fale com o RH — sem dados no período.`
    ];

    let by = ySummary + 44;
    for (const b of bullets) {
        doc.fillColor(THEME.colors.accent).circle(marginLeft + 22, by + 6, 2).fill();
        doc.fillColor(THEME.colors.text).font("Helvetica").fontSize(10).text(safeOneLine(b, 140), marginLeft + 34, by, {
            width: contentWidth - 50
        });
        by += 22;
    }

    doc.addPage();

    // ========= PÁGINA 2 =========
    drawTopHeader(doc, {
        title: "Desempenho de Comunicados",
        subtitle: "Ranking por visualizações e detalhamento",
        rightText: "Seção 1",
        logoPng
    });

    drawSectionTitle(doc, "Comunicados mais visualizados", "Top 5 por visualizações agregadas no período (somente publicados).");

    {
        const cardH = 290;
        const x = marginLeft;
        const y = doc.y;
        drawCard(doc, { x, y, w: contentWidth, h: cardH });

        if (!topChartPng) {
            doc.fillColor(THEME.colors.muted).font("Helvetica").fontSize(10).text("Sem dados de visualização no período.", x + 16, y + 16, {
                width: contentWidth - 32
            });
        } else {
            doc.image(topChartPng, x + 16, y + 16, { width: contentWidth - 32 });
        }
        doc.y = y + cardH + 14;
    }

    {
        const rows = (data.topComunicados || []).map((t, idx) => ({
            rank: idx + 1,
            id: t.id,
            titulo: safeOneLine(t.titulo, 70),
            views: t.views
        }));

        drawSectionTitle(doc, "Detalhamento", "Itens do ranking com identificador e volume de views.");
        if (!rows.length) {
            doc.fillColor(THEME.colors.muted).font("Helvetica").fontSize(10).text("Sem itens para detalhar.", marginLeft, doc.y);
        } else {
            drawTable(doc, {
                x: marginLeft,
                y: doc.y,
                w: contentWidth,
                columns: [
                    { header: "#", key: "rank", width: 40, align: "center" },
                    { header: "ID", key: "id", width: 60, align: "center" },
                    { header: "Título", key: "titulo", width: contentWidth - 40 - 60 - 110, align: "left" },
                    { header: "Views", key: "views", width: 110, align: "right", format: (v) => formatInt(v) }
                ],
                rows
            });
        }
    }

    doc.addPage();

    // ========= PÁGINA 3 =========
    drawTopHeader(doc, {
        title: "Acessos e Tráfego",
        subtitle: "Acessos ao endpoint /comunicados agregados por semana",
        rightText: "Seção 2",
        logoPng
    });

    drawSectionTitle(doc, "Acessos por semana", "Série semanal no período solicitado.");

    {
        const cardH = 290;
        const x = marginLeft;
        const y = doc.y;
        drawCard(doc, { x, y, w: contentWidth, h: cardH });

        if (!acessosChartPng) {
            doc.fillColor(THEME.colors.muted).font("Helvetica").fontSize(10).text("Sem dados de acessos no período.", x + 16, y + 16, {
                width: contentWidth - 32
            });
        } else {
            doc.image(acessosChartPng, x + 16, y + 16, { width: contentWidth - 32 });
        }
        doc.y = y + cardH + 14;
    }

    {
        const rows = (data.acessosSemana || []).map((w) => ({
            semana: w.yearweek,
            intervalo: rangeToShort(w.inicio, w.fim),
            acessos: w.acessos
        }));

        drawSectionTitle(doc, "Detalhamento", "Consolidação semanal com intervalo (início/fim) e volume.");
        if (!rows.length) {
            doc.fillColor(THEME.colors.muted).font("Helvetica").fontSize(10).text("Sem itens para detalhar.", marginLeft, doc.y);
        } else {
            drawTable(doc, {
                x: marginLeft,
                y: doc.y,
                w: contentWidth,
                columns: [
                    { header: "Semana", key: "semana", width: 90, align: "center" },
                    { header: "Intervalo", key: "intervalo", width: contentWidth - 90 - 130, align: "left" },
                    { header: "Acessos", key: "acessos", width: 130, align: "right", format: (v) => formatInt(v) }
                ],
                rows
            });
        }
    }

    doc.addPage();

    // ========= PÁGINA 4 =========
    drawTopHeader(doc, {
        title: "Comunicados Críticos",
        subtitle: "Confirmações de leitura e taxa sobre base ativa",
        rightText: "Seção 3",
        logoPng
    });

    drawSectionTitle(
        doc,
        "Confirmações de leitura (críticos)",
        `Base: ${formatInt(data.totalColabsAtivos)} colaboradores ativos. Itens listados: Top 10 por confirmações.`
    );

    {
        const cardH = 300;
        const x = marginLeft;
        const y = doc.y;
        drawCard(doc, { x, y, w: contentWidth, h: cardH });

        if (!critItems.length) {
            doc.fillColor(THEME.colors.muted).font("Helvetica").fontSize(10).text("Sem comunicados críticos no período.", x + 16, y + 16, {
                width: contentWidth - 32
            });
        } else if (!hasCritChart) {
            doc.fillColor(THEME.colors.muted).font("Helvetica").fontSize(10).text("Há comunicados críticos, porém sem confirmações no período.", x + 16, y + 16, {
                width: contentWidth - 32
            });
        } else {
            doc.image(critChartPng, x + 16, y + 16, { width: contentWidth - 32 });
        }
        doc.y = y + cardH + 14;
    }

    {
        const rows = (data.confirmacoesCriticos || []).map((c, idx) => ({
            rank: idx + 1,
            id: c.id,
            titulo: safeOneLine(c.titulo, 62),
            confirmacoes: c.confirmacoes,
            taxa: c.percentual
        }));

        drawSectionTitle(doc, "Detalhamento", "Quantidade e taxa aproximada (confirmações ÷ base ativa).");
        if (!rows.length) {
            doc.fillColor(THEME.colors.muted).font("Helvetica").fontSize(10).text("Sem itens para detalhar.", marginLeft, doc.y);
        } else {
            drawTable(doc, {
                x: marginLeft,
                y: doc.y,
                w: contentWidth,
                columns: [
                    { header: "#", key: "rank", width: 40, align: "center" },
                    { header: "ID", key: "id", width: 60, align: "center" },
                    { header: "Título", key: "titulo", width: contentWidth - 40 - 60 - 120 - 95, align: "left" },
                    { header: "Confirmações", key: "confirmacoes", width: 120, align: "right", format: (v) => formatInt(v) },
                    { header: "Taxa", key: "taxa", width: 95, align: "right", format: (v) => formatPct01(v) }
                ],
                rows
            });
        }
    }

    doc.addPage();

    // ========= PÁGINA 5 =========
    drawTopHeader(doc, {
        title: "Fale com o RH",
        subtitle: "Temas mais frequentes e distribuição",
        rightText: "Seção 4",
        logoPng
    });

    drawSectionTitle(doc, "Temas mais frequentes", "Top 10 (quando a tabela estiver disponível e houver registros no período).");

    {
        const cardH = 300;
        const x = marginLeft;
        const y = doc.y;
        drawCard(doc, { x, y, w: contentWidth, h: cardH });

        if (!temasChartPng) {
            doc.fillColor(THEME.colors.muted).font("Helvetica").fontSize(10).text(
                "Sem dados (tabela ainda não disponível ou sem registros no período).",
                x + 16,
                y + 16,
                { width: contentWidth - 32 }
            );
        } else {
            doc.image(temasChartPng, x + 16, y + 16, { width: contentWidth - 32 });
        }
        doc.y = y + cardH + 14;
    }

    {
        const rows = (data.temasFaleRh || []).map((t, idx) => ({
            rank: idx + 1,
            tema: safeOneLine(t.tema, 70),
            total: t.total
        }));

        drawSectionTitle(doc, "Detalhamento", "Lista ordenada por volume de ocorrências.");
        if (!rows.length) {
            doc.fillColor(THEME.colors.muted).font("Helvetica").fontSize(10).text("Sem itens para detalhar.", marginLeft, doc.y);
        } else {
            drawTable(doc, {
                x: marginLeft,
                y: doc.y,
                w: contentWidth,
                columns: [
                    { header: "#", key: "rank", width: 40, align: "center" },
                    { header: "Tema", key: "tema", width: contentWidth - 40 - 130, align: "left" },
                    { header: "Total", key: "total", width: 130, align: "right", format: (v) => formatInt(v) }
                ],
                rows
            });
        }
    }

    // ========= Rodapé em todas as páginas (sem gerar páginas extras) =========
    const pageRange = doc.bufferedPageRange(); // { start, count }
    const totalPages = pageRange.count;

    for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(pageRange.start + i);
        drawFooterSafe(doc, { pageNumber: i + 1, totalPages, leftText: footerLeft });
    }

    doc.end();

    const pdfBuffer = await new Promise((resolve) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    const filename = `RELATORIO_${data.period.from}_A_${data.period.to}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(pdfBuffer);
}
