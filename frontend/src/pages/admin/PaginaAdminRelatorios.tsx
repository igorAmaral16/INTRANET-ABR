import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Calendar, Download, Sparkles } from "lucide-react";

import { SidebarAdmin } from "../../components/SidebarAdmin/SidebarAdmin";
import { BotaoVoltar } from "../../components/BotaoVoltar/BotaoVoltar";
import { useSessaoAuth } from "../../hooks/useSessaoAuth";
import { ErroHttp } from "../../api/clienteHttp";
import { baixarBlobComoArquivo, gerarRelatorioAdmin } from "../../api/relatorios.api";

import "../PaginaBase.css";
import "./PaginaAdminRelatorios.css";

function ymdHoje() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function ymdDiasAtras(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export function PaginaAdminRelatorios() {
    const navigate = useNavigate();
    const { sessao, estaLogadoAdmin, sair } = useSessaoAuth();

    const [from, setFrom] = useState(ymdDiasAtras(28));
    const [to, setTo] = useState(ymdHoje());
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const acRef = useRef<AbortController | null>(null);

    // const estaLogado = Boolean(sessao?.token);
    // const role = sessao?.role;

    const periodoOk = useMemo(() => {
        if (!from || !to) return true;
        return from <= to;
    }, [from, to]);

    async function gerar() {
        if (!estaLogadoAdmin || !sessao?.token) {
            navigate("/", { replace: true });
            return;
        }

        if (!periodoOk) {
            setErro("Período inválido: a data inicial deve ser menor ou igual à data final.");
            return;
        }

        acRef.current?.abort();
        const ac = new AbortController();
        acRef.current = ac;

        setCarregando(true);
        setErro(null);

        try {
            const blob = await gerarRelatorioAdmin(
                { token: sessao.token, from: from || undefined, to: to || undefined },
                ac.signal
            );

            const filename = `RELATORIO_${(from || "AUTO")}_A_${(to || "AUTO")}.pdf`;
            baixarBlobComoArquivo(blob, filename);
        } catch (e: any) {
            if (e?.name === "AbortError") return;
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            setErro(msg || "Não foi possível gerar o relatório.");
        } finally {
            setCarregando(false);
        }
    }

    return (
        <div className="paginaBase">
            <SidebarAdmin
                estaLogado={Boolean(sessao?.token)}
                aoIrParaHome={() => navigate("/admin/home")}
                aoCriarComunicado={() => navigate("/admin/criar-comunicado")}
                aoDocumentos={() => navigate("/admin/documentos")}
                aoColaboradores={() => navigate("/admin/colaboradores")}
                aoCalendario={() => navigate("/admin/calendario")}
                aoFaq={() => navigate("/admin/faq")}
                aoFaleComRh={() => navigate("/admin/fale-com-rh")}
                aoRelatorios={() => navigate("/admin/relatorios")}
                aoCarrossel={() => navigate("/admin/carousel")}
                aoSair={() => {
                    sair();
                    navigate("/", { replace: true });
                }}
            />


            <main className="paginaBase__conteudo">
                <BotaoVoltar destino="/admin/home" />
                <div className="paginaBase__topoInterno">
                    <h1 className="paginaBase__titulo">Admin — Gerar relatórios</h1>
                </div>

                <section className="admRel__hero card">
                    <div className="admRel__heroIcon">
                        <FileText size={22} />
                    </div>

                    <div className="admRel__heroTxt">
                        <div className="admRel__heroTitulo">
                            Relatório gerencial (PDF) <span className="admRel__tag"><Sparkles size={14} /> automático</span>
                        </div>
                        <div className="admRel__heroSub">
                            Gera um PDF consolidado com indicadores de comunicados, acessos e confirmações.
                        </div>
                    </div>

                    <button
                        type="button"
                        className="admRel__btnPrimario"
                        onClick={gerar}
                        disabled={carregando}
                        aria-label="Gerar relatório"
                    >
                        <Download size={18} />
                        {carregando ? "Gerando..." : "Gerar relatório"}
                    </button>
                </section>

                <section className="admRel__periodo card">
                    <div className="admRel__periodoTopo">
                        <div className="admRel__periodoTitulo">
                            <Calendar size={18} /> Período
                        </div>
                        <div className="admRel__periodoHint">Opcional. Se vazio, o backend usa o padrão.</div>
                    </div>

                    <div className="admRel__grid">
                        <label className="admRel__campo">
                            <span>De (YYYY-MM-DD)</span>
                            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="2026-01-01" />
                        </label>

                        <label className="admRel__campo">
                            <span>Até (YYYY-MM-DD)</span>
                            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="2026-01-31" />
                        </label>

                        <button
                            type="button"
                            className="admRel__btnSecundario"
                            onClick={() => {
                                setFrom(ymdDiasAtras(28));
                                setTo(ymdHoje());
                            }}
                            disabled={carregando}
                        >
                            Reset 28 dias
                        </button>
                    </div>

                    {!periodoOk ? <div className="admRel__erro">Período inválido: “De” deve ser ≤ “Até”.</div> : null}
                    {erro ? <div className="admRel__erro">{erro}</div> : null}
                </section>
            </main>
        </div>
    );
}
