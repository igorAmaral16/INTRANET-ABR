import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Folder, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { BarraTopo } from "../components/BarraTopo/BarraTopo";
import { useSessaoAuth } from "../hooks/useSessaoAuth";
import { obterArvoreBiblioteca, type NoBiblioteca } from "../api/biblioteca.api";
import { resolverUrlApi } from "../utils/urlApi";
import "./PaginaBase.css";
import "./PaginaDocumentos.css";

function isAbortError(e: any) {
    return e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("aborted");
}

function NoArvore({
    no,
    abertos,
    alternar,
}: {
    no: NoBiblioteca;
    abertos: Set<string>;
    alternar: (id: string) => void;
}) {
    const id = String(no.id);
    const aberto = abertos.has(id);

    if (no.tipo === "DOCUMENTO") {
        const url = no.url ? resolverUrlApi(no.url) : "";
        return (
            <a className="docItem" href={url || "#"} target={url ? "_blank" : undefined} rel="noreferrer">
                <FileText size={16} />
                <span>{no.nome}</span>
            </a>
        );
    }

    return (
        <div className="pasta">
            <button className="pasta__topo" type="button" onClick={() => alternar(id)}>
                {aberto ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <Folder size={16} />
                <span className="pasta__nome">{no.nome}</span>
            </button>

            {aberto && Array.isArray(no.filhos) && no.filhos.length > 0 ? (
                <div className="pasta__filhos">
                    {no.filhos.map((f) => (
                        <NoArvore key={String(f.id)} no={f} abertos={abertos} alternar={alternar} />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export function PaginaDocumentos() {
    const navigate = useNavigate();
    const { estaLogadoColab, sair } = useSessaoAuth();

    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [arvore, setArvore] = useState<NoBiblioteca[]>([]);

    const [abertos, setAbertos] = useState<Set<string>>(() => new Set());

    useEffect(() => {
        const ac = new AbortController();

        (async () => {
            setCarregando(true);
            setErro(null);

            try {
                const data = await obterArvoreBiblioteca(ac.signal);
                setArvore(data);
            } catch (e: any) {
                if (isAbortError(e)) return; // não exibe abort como erro
                setErro(e?.message || "Não foi possível carregar a biblioteca.");
            } finally {
                if (!ac.signal.aborted) setCarregando(false);
            }
        })();

        return () => ac.abort();
    }, []);

    const alternar = (id: string) => {
        setAbertos((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    };

    const vazio = useMemo(
        () => !carregando && !erro && (!arvore || arvore.length === 0),
        [carregando, erro, arvore]
    );

    return (
        <div className="paginaBase">
            <BarraTopo
                busca=""
                aoMudarBusca={() => { }}
                mostrarBusca={false}
                aoIrParaInicio={() => navigate("/")}

                estaLogado={Boolean(estaLogadoColab)}
                role={"COLAB"}

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
                    <h1 className="paginaBase__titulo">Biblioteca de Documentos</h1>
                </div>

                {carregando ? <div className="card">Carregando...</div> : null}
                {!carregando && erro ? <div className="card cardErro">{erro}</div> : null}
                {vazio ? <div className="card">Nenhum documento disponível.</div> : null}

                {!carregando && !erro && arvore.length > 0 ? (
                    <section className="arvore">
                        {arvore.map((n) => (
                            <NoArvore key={String(n.id)} no={n} abertos={abertos} alternar={alternar} />
                        ))}
                    </section>
                ) : null}
            </main>
        </div>
    );
}
