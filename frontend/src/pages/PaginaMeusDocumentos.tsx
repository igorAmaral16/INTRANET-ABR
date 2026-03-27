import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { SidebarFixed } from "../components/SidebarFixed/SidebarFixed";
import { BotaoVoltar } from "../components/BotaoVoltar/BotaoVoltar";
import { useSessaoAuth } from "../hooks/useSessaoAuth";
import { obterArvoreBibliotecaColab, type NoBiblioteca } from "../api/biblioteca.api";
import { resolverUrlApi } from "../utils/urlApi";
import "./PaginaBase.css";
import "./PaginaMeusDocumentos.css";

function isAbortError(e: any) {
    return e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("aborted");
}

function NoArvore({
    no,
    abertos,
    alternar,
    depth = 0,
}: {
    no: NoBiblioteca;
    abertos: Set<string>;
    alternar: (id: string) => void;
    depth?: number;
}) {
    const id = String(no.id);
    const aberto = abertos.has(id);

    if (no.tipo === "DOCUMENTO") {
        const url = no.url ? resolverUrlApi(no.url) : "";
        return (
            <a
                className="docItem"
                style={{ marginLeft: `${depth * 20}px` }}
                href={url || "#"}
                target={url ? "_blank" : undefined}
                rel="noreferrer"
            >
                <FileText size={16} />
                <span>{no.nome}</span>
            </a>
        );
    }

    return (
        <div className="pasta">
            <button
                className="pasta__topo"
                style={{ marginLeft: `${depth * 20}px` }}
                type="button"
                onClick={() => alternar(id)}
            >
                {aberto ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <Folder size={16} />
                <span className="pasta__nome">{no.nome}</span>
            </button>

            {aberto && Array.isArray(no.filhos) && no.filhos.length > 0 ? (
                <div className="pasta__filhos">
                    {no.filhos.map((f) => (
                        <NoArvore key={String(f.id)} no={f} abertos={abertos} alternar={alternar} depth={depth + 1} />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export function PaginaMeusDocumentos() {
    const navigate = useNavigate();
    const { sessao, sair } = useSessaoAuth();

    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [arvore, setArvore] = useState<NoBiblioteca[]>([]);

    const [abertos, setAbertos] = useState<Set<string>>(() => new Set());

    useEffect(() => {
        if (!sessao?.token) {
            setErro("Faça login como colaborador para acessar seus documentos.");
            setCarregando(false);
            setArvore([]);
            return;
        }

        const ac = new AbortController();

        (async () => {
            setCarregando(true);
            setErro(null);

            try {
                const data = await obterArvoreBibliotecaColab({ token: sessao.token }, ac.signal);
                setArvore(data);
            } catch (e: any) {
                if (isAbortError(e)) return;
                setErro(e?.message || "Não foi possível carregar seus documentos.");
            } finally {
                if (!ac.signal.aborted) setCarregando(false);
            }
        })();

        return () => ac.abort();
    }, [sessao?.token]);

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
            <SidebarFixed
                estaLogado={Boolean(sessao?.token)}
                role={sessao?.role}
                aoIrParaHome={() => navigate("/")}
                aoMeuPerfil={() => navigate("/meu-perfil")}
                aoVerDocumentos={() => navigate("/documentos")}
                aoMeusDocumentos={() => navigate("/meus-documentos")}
                aoCalendario={() => navigate("/calendario")}
                aoFaq={() => navigate("/faq")}
                aoFaleComRh={() => navigate("/fale-com-rh")}
                aoClicarEntrar={() => navigate("/")}
                aoSair={() => {
                    sair();
                    navigate("/", { replace: true });
                }}
            />

            <main className="paginaBase__conteudo">
                <BotaoVoltar destino="/" />
                <div className="paginaBase__topoInterno">
                    <h1 className="paginaBase__titulo">Meus Documentos</h1>
                </div>

                {carregando ? <div className="card">Carregando...</div> : null}
                {!carregando && erro ? <div className="card cardErro">{erro}</div> : null}
                {vazio ? (
                    <div className="card">
                        <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                            <FileText size={48} />
                            <p>Você ainda não tem documentos aqui.</p>
                        </div>
                    </div>
                ) : null}

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