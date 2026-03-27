import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTutorials } from "../hooks/useTutorials.ts";
import type { TutorialResumo } from "../api/tutorials.api";
import { useSessaoAuth } from "../hooks/useSessaoAuth";
import { SidebarFixed } from "../components/SidebarFixed/SidebarFixed";
import { BotaoVoltar } from "../components/BotaoVoltar/BotaoVoltar";
import { Search } from "lucide-react";
import "./PaginaTutoriaisSetor.css";

export function PaginaTutoriaisSetor() {
    const { setor } = useParams();
    const navigate = useNavigate();
    const { sessao, sair } = useSessaoAuth();
    const { itens, loading, error, refetch } = useTutorials(setor || "");
    const [busca, setBusca] = useState("");

    useEffect(() => {
        if (setor) refetch();
    }, [setor, refetch]);

    const itensFiltrados = itens.filter((t: TutorialResumo) =>
        t.titulo.toLowerCase().includes(busca.toLowerCase())
    );

    return (
        <div className="paginaTutoriaisSetor">
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
                aoComunicados={() => navigate("/comunicados")}
                aoClicarEntrar={() => navigate("/")}
                aoSair={() => {
                    sair();
                    navigate("/", { replace: true });
                }}
            />

            <main className="paginaTutoriaisSetor__conteudo">
                <BotaoVoltar destino="/tutoriais" />

                <section className="paginaTutoriaisSetor__header">
                    <h1 className="paginaTutoriaisSetor__titulo">Tutoriais - {setor}</h1>
                    <p className="paginaTutoriaisSetor__subtitulo">
                        Vídeos de treinamento e desenvolvimento do setor
                    </p>
                </section>

                <div className="paginaTutoriaisSetor__toolbar">
                    <div className="paginaTutoriaisSetor__busca">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por título..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                    </div>
                    {!loading && itensFiltrados.length > 0 && (
                        <span className="paginaTutoriaisSetor__contador">
                            {itensFiltrados.length} {itensFiltrados.length === 1 ? "vídeo" : "vídeos"}
                        </span>
                    )}
                </div>

                <section className="paginaTutoriaisSetor__lista">
                    {loading && (
                        <div className="paginaTutoriaisSetor__loading">
                            <div className="spinner"></div>
                            <p>Carregando vídeos...</p>
                        </div>
                    )}
                    {error && (
                        <div className="paginaTutoriaisSetor__erro">
                            <p>Erro ao carregar tutoriais.</p>
                        </div>
                    )}
                    {!loading && itensFiltrados.length === 0 && (
                        <div className="paginaTutoriaisSetor__vazio">
                            <p>Nenhum vídeo encontrado para este setor/termo.</p>
                        </div>
                    )}
                    {itensFiltrados.map((t: TutorialResumo) => (
                        <article key={t.id} className="paginaTutoriaisSetor__video">
                            <div className="paginaTutoriaisSetor__videoContainer">
                                <video controls className="paginaTutoriaisSetor__videoPlayer">
                                    <source src={t.url} type="video/mp4" />
                                    Seu navegador não suporta o elemento de vídeo.
                                </video>
                            </div>
                            <div className="paginaTutoriaisSetor__videoInfo">
                                <h2 className="paginaTutoriaisSetor__videoTitulo">{t.titulo}</h2>
                                <p className="paginaTutoriaisSetor__videoData">
                                    {new Date(t.data_publicacao).toLocaleDateString("pt-BR")}
                                </p>
                                {t.descricao && (
                                    <p className="paginaTutoriaisSetor__videoDescricao">
                                        {t.descricao}
                                    </p>
                                )}
                            </div>
                        </article>
                    ))}
                </section>
            </main>
        </div>
    );
}
