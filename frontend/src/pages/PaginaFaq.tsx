import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle, ChevronDown, ChevronRight } from "lucide-react";
import { BarraTopo } from "../components/BarraTopo/BarraTopo";
import { useSessaoAuth } from "../hooks/useSessaoAuth";
import { listarFaq, type FaqItem } from "../api/faq.api";
import "./PaginaBase.css";
import "./PaginaFaq.css";

function isAbortError(e: any) {
    return e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("aborted");
}

export function PaginaFaq() {
    const navigate = useNavigate();
    const { estaLogadoColab, sair } = useSessaoAuth();

    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [itens, setItens] = useState<FaqItem[]>([]);
    const [abertos, setAbertos] = useState<Set<string>>(() => new Set());

    useEffect(() => {
        const ac = new AbortController();

        (async () => {
            setCarregando(true);
            setErro(null);

            try {
                const data = await listarFaq(ac.signal);
                setItens(data);
            } catch (e: any) {
                if (isAbortError(e)) return; // não exibe erro em abort
                setErro(e?.message || "Não foi possível carregar o FAQ.");
            } finally {
                if (!ac.signal.aborted) setCarregando(false);
            }
        })();

        return () => ac.abort();
    }, []);

    const vazio = useMemo(
        () => !carregando && !erro && itens.length === 0,
        [carregando, erro, itens]
    );

    const alternar = (id: string) => {
        setAbertos((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    };

    return (
        <div className="paginaBase">
            <BarraTopo
                busca=""
                aoMudarBusca={() => { }}
                mostrarBusca={false}
                aoIrParaInicio={() => navigate("/")}

                estaLogado={Boolean(estaLogadoColab)}
                role={"COLAB"}  // ou role={sessao?.role} se você tiver aqui

                aoClicarEntrar={() => navigate("/")}

                aoMeuPerfil={() => navigate("/meu-perfil")}
                aoVerDocumentos={() => navigate("/documentos")}
                aoFaq={() => navigate("/faq")}
                aoFaleComRh={() => navigate("/fale-com-rh")}
                aoSair={sair}
            />


            <main className="paginaBase__conteudo">
                <div className="paginaBase__topoInterno">
                    <button className="botaoVoltar" type="button" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} /> Voltar
                    </button>
                    <h1 className="paginaBase__titulo">Dúvidas Frequentes (FAQ)</h1>
                </div>

                {carregando ? <div className="card">Carregando...</div> : null}
                {!carregando && erro ? <div className="card cardErro">{erro}</div> : null}
                {vazio ? <div className="card">Nenhuma dúvida cadastrada.</div> : null}

                {!carregando && !erro && itens.length > 0 ? (
                    <section className="faq">
                        {itens.map((f) => {
                            const id = String(f.id);
                            const aberto = abertos.has(id);

                            return (
                                <div className="faqItem" key={id}>
                                    <button className="faqItem__topo" type="button" onClick={() => alternar(id)}>
                                        {aberto ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        <HelpCircle size={16} />
                                        <div className="faqItem__titulos">
                                            <div className="faqItem__titulo">{f.titulo}</div>
                                            <div className="faqItem__categoria">{f.categoria}</div>
                                        </div>
                                    </button>

                                    {aberto ? <div className="faqItem__conteudo">{f.descricao}</div> : null}
                                </div>
                            );
                        })}
                    </section>
                ) : null}
            </main>
        </div>
    );
}
