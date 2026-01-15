import { z } from "zod";
import PDFDocument from "pdfkit";
import { fetchRelatorioData } from "../services/relatorios.service.js";

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

const QuerySchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

function drawBarChart(doc, { title, items, valueKey, labelKey, x, y, width, height }) {
    doc.fontSize(12).text(title, x, y);
    const chartTop = y + 18;

    const max = items.reduce((m, it) => Math.max(m, Number(it[valueKey] || 0)), 0) || 1;
    const barAreaHeight = height - 30;
    const barWidth = Math.max(10, Math.floor(width / Math.max(items.length, 1)) - 10);

    let cx = x;
    for (const it of items) {
        const v = Number(it[valueKey] || 0);
        const h = Math.round((v / max) * barAreaHeight);

        const barX = cx;
        const barY = chartTop + (barAreaHeight - h);

        // Barra
        doc.rect(barX, barY, barWidth, h).stroke();

        // Valor
        doc.fontSize(8).text(String(v), barX, barY - 10, { width: barWidth, align: "center" });

        // Label (cortado)
        const label = String(it[labelKey] || "").slice(0, 14);
        doc.fontSize(8).text(label, barX, chartTop + barAreaHeight + 4, {
            width: barWidth,
            align: "center"
        });

        cx += barWidth + 10;
    }

    // eixo base
    doc.moveTo(x, chartTop + barAreaHeight).lineTo(x + width, chartTop + barAreaHeight).stroke();
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

    // PDF em memória (para começar; se crescer, pode stream direto)
    const doc = new PDFDocument({ size: "A4", margin: 40 });

    const chunks = [];
    doc.on("data", (c) => chunks.push(c));

    doc.fontSize(18).text("RELATÓRIO GERENCIAL - INTRANET", { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Período: ${data.period.from} a ${data.period.to}`);
    doc.fontSize(10).text(`Gerado por: ${req.user?.username || "ADMIN"}`);
    doc.moveDown(1);

    // Seção 1: Top visualizações
    doc.fontSize(14).text("1) Comunicados mais visualizados", { underline: true });
    doc.moveDown(0.5);

    if (!data.topComunicados.length) {
        doc.fontSize(10).text("Sem dados de visualização no período.");
    } else {
        const items = data.topComunicados.map((x) => ({
            label: x.titulo,
            value: x.views
        }));

        drawBarChart(doc, {
            title: "Top 5 (views)",
            items,
            valueKey: "value",
            labelKey: "label",
            x: 40,
            y: doc.y,
            width: 520,
            height: 140
        });

        doc.moveDown(8);
        doc.fontSize(10).text("Detalhamento:");
        for (const t of data.topComunicados) {
            doc.fontSize(9).text(`- [${t.id}] ${t.titulo} — ${t.views} views`);
        }
    }

    doc.addPage();

    // Seção 2: Acessos semanais
    doc.fontSize(14).text("2) Quantidade de acessos por semana", { underline: true });
    doc.moveDown(0.5);

    if (!data.acessosSemana.length) {
        doc.fontSize(10).text("Sem dados de acessos no período.");
    } else {
        const items = data.acessosSemana.map((w) => ({
            label: `${w.inicio}..${w.fim}`,
            value: w.acessos
        }));

        drawBarChart(doc, {
            title: "Acessos por semana (agregado)",
            items,
            valueKey: "value",
            labelKey: "label",
            x: 40,
            y: doc.y,
            width: 520,
            height: 150
        });

        doc.moveDown(8);
        doc.fontSize(10).text("Detalhamento:");
        for (const w of data.acessosSemana) {
            doc.fontSize(9).text(`- Semana ${w.yearweek} (${w.inicio}..${w.fim}): ${w.acessos}`);
        }
    }

    doc.addPage();

    // Seção 3: Confirmaram leitura (críticos)
    doc.fontSize(14).text("3) Confirmaram leitura (somente críticos)", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Total de colaboradores ativos (base): ${data.totalColabsAtivos}`);
    doc.moveDown(0.5);

    if (!data.confirmacoesCriticos.length) {
        doc.fontSize(10).text("Sem comunicados críticos ou confirmações no período.");
    } else {
        doc.fontSize(10).text("Top críticos por confirmações:");
        for (const c of data.confirmacoesCriticos) {
            const pct = (c.percentual * 100).toFixed(1);
            doc.fontSize(9).text(`- [${c.id}] ${c.titulo} — ${c.confirmacoes} confirmações (${pct}%)`);
        }
    }

    doc.moveDown(1);

    // Seção 4: Temas do Fale com RH
    doc.fontSize(14).text("4) Temas mais frequentes no “Fale com o RH”", { underline: true });
    doc.moveDown(0.5);

    if (!data.temasFaleRh.length) {
        doc.fontSize(10).text("Sem dados (tabela ainda não disponível ou sem registros no período).");
    } else {
        for (const t of data.temasFaleRh) {
            doc.fontSize(9).text(`- ${t.tema}: ${t.total}`);
        }
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
