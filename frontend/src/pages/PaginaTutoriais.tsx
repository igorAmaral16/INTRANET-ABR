import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTutorials } from "../hooks/useTutorials.ts";
import type { TutorialResumo } from "../api/tutorials.api";
import { useSessaoAuth } from "../hooks/useSessaoAuth";
import { BarraTopo } from "../components/BarraTopo/BarraTopo";
import "./PaginaTutoriais.css";

export function PaginaTutoriais() {
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
        <div className="paginaBase paginaTutoriais">
            <BarraTopo
                busca=""
                aoMudarBusca={() => { }}
                mostrarBusca={false}
                aoIrParaInicio={() => navigate("/")}
                estaLogado={Boolean(sessao?.token)}
                role={sessao?.role}
                aoClicarEntrar={() => navigate("/")}
                aoMeuPerfil={() => navigate("/meu-perfil")}
                aoVerDocumentos={() => navigate("/documentos")}
                aoMeusDocumentos={() => navigate("/meus-documentos")}
                aoCalendario={() => navigate("/calendario")}
                aoFaq={() => navigate("/faq")}
                aoFaleComRh={() => navigate("/fale-com-rh")}
                aoSair={() => {
                    sair();
                    navigate("/", { replace: true });
                }}
            />

            <header className="paginaTutoriais__header card">
                <h1 className="paginaTutoriais__titulo">Tutoriais</h1>
                <div className="paginaTutoriais__setor">Setor: {setor}</div>
                <div className="paginaTutoriais__busca">
                    <input
                        type="text"
                        placeholder="Buscar por título..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                    />
                </div>
            </header>
            <main className="paginaTutoriais__lista">
                {loading && <p>Carregando...</p>}
                {error && <p className="error">Erro ao carregar tutoriais.</p>}
                {!loading && itensFiltrados.length === 0 && (
                    <p>Nenhum vídeo encontrado para este setor/termo.</p>
                )}
                {itensFiltrados.map((t: TutorialResumo) => (
                    <article key={t.id} className="paginaTutoriais__item card">
                        <h2>{t.titulo}</h2>
                        <p className="paginaTutoriais__data">{t.data_publicacao}</p>
                        <p>{t.descricao}</p>
                        <video width="100%" controls>
                            <source src={t.url} type="video/mp4" />
                            Seu navegador não suporta o elemento de vídeo.
                        </video>
                    </article>
                ))}
            </main>
        </div>
    );
}
