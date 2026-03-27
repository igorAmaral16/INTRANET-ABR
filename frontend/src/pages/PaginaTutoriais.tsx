import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSessaoAuth } from "../hooks/useSessaoAuth";
import { SidebarFixed } from "../components/SidebarFixed/SidebarFixed";
import { BotaoVoltar } from "../components/BotaoVoltar/BotaoVoltar";
import { setores } from "../utils/setores";
import { listarTutoriais } from "../api/tutorials.api";
import {
    Code,
    Users,
    Settings,
    CheckCircle,
    ShoppingCart,
    Truck,
    Cog,
    Wrench,
    Package,
    ClipboardList,
} from "lucide-react";
import "./PaginaTutoriais.css";

// Ícones customizados como componentes
const Factory = (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l6-7v7m0-7h2v14m2-14h2v14m2-14h2v14m3 0h3V9" />
    </svg>
);

const Beaker = (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4.5 3h15v2h-1.5l-1.5 12c0 1.5-1 2-2 2h-6c-1 0-2-.5-2-2l-1.5-12H3V3z" />
    </svg>
);

// Mapeamento de ícones por setor
const iconesSetores: Record<string, React.ReactNode> = {
    "PCP": <ClipboardList size={32} />,
    "Compras": <ShoppingCart size={32} />,
    "TI": <Code size={32} />,
    "RH": <Users size={32} />,
    "Qualidade": <CheckCircle size={32} />,
    "Expedição": <Truck size={32} />,
    "Montagem": <Wrench size={32} />,
    "Produção": <Factory size={32} />,
    "Almoxarifado": <Package size={32} />,
    "Laboratório": <Beaker size={32} />,
    "Processos": <Cog size={32} />,
    "Manutenção": <Settings size={32} />,
};

// Cores para cada setor
const coresSetores: Record<string, string> = {
    "PCP": "#FF6B6B",
    "Compras": "#4ECDC4",
    "TI": "#45B7D1",
    "RH": "#96CEB4",
    "Qualidade": "#FFEAA7",
    "Expedição": "#DDA15E",
    "Montagem": "#BC6C25",
    "Produção": "#A8DADC",
    "Almoxarifado": "#F4A261",
    "Laboratório": "#E76F51",
    "Processos": "#2A9D8F",
    "Manutenção": "#E9C46A",
};

interface SetorCard {
    nome: string;
    quantidadeVideos: number;
    descricao: string;
}

export function PaginaTutoriais() {
    const navigate = useNavigate();
    const { sessao, sair } = useSessaoAuth();
    const [setoresComVideos, setSetoresComVideos] = useState<SetorCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function carregarSetores() {
            try {
                console.log("📚 Iniciando carregamento de setores...", setores);
                const promises = setores.map(async (setor) => {
                    try {
                        const videos = await listarTutoriais(setor);
                        console.log(`✅ ${setor}: ${videos.length} vídeos`);
                        return {
                            nome: setor,
                            quantidadeVideos: videos.length,
                            descricao: `Tutoriais e treinamentos do setor de ${setor}`,
                        };
                    } catch (err) {
                        console.log(`⚠️ ${setor}: erro ao carregar (usando 0)`, err);
                        // Se falhar, exibe 0 vídeos
                        return {
                            nome: setor,
                            quantidadeVideos: 0,
                            descricao: `Tutoriais e treinamentos do setor de ${setor}`,
                        };
                    }
                });
                const dados = await Promise.all(promises);
                console.log("📊 Setores carregados:", dados);
                setSetoresComVideos(dados);
            } catch (err) {
                console.error("❌ Erro ao carregar setores:", err);
            } finally {
                setLoading(false);
            }
        }
        carregarSetores();
    }, []);

    return (
        <div className="paginaTutoriais">
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

            <main className="paginaTutoriais__conteudo">
                <BotaoVoltar destino="/" />

                <section className="paginaTutoriais__header">
                    <h1 className="paginaTutoriais__titulo">Tutoriais</h1>
                    <p className="paginaTutoriais__subtitulo">
                        Escolha um setor para acessar os vídeos de treinamento
                    </p>
                </section>

                <div className="paginaTutoriais__info">
                    <span className="paginaTutoriais__contador">
                        {setoresComVideos.length} setores disponíveis
                    </span>
                </div>

                {loading ? (
                    <div className="paginaTutoriais__loading">
                        <p>Carregando setores...</p>
                    </div>
                ) : (
                    <section className="paginaTutoriais__grid">
                        {setoresComVideos.map((setor) => (
                            <div
                                key={setor.nome}
                                className="paginaTutoriais__card"
                                onClick={() => {
                                    console.log("🖱️ Clicou em setor:", setor.nome);
                                    navigate(`/tutoriais/${encodeURIComponent(setor.nome)}`);
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        console.log("⌨️ Pressionou Enter/Espaço em:", setor.nome);
                                        navigate(`/tutoriais/${encodeURIComponent(setor.nome)}`);
                                    }
                                }}
                            >
                                <div
                                    className="paginaTutoriais__cardIcone"
                                    style={{ backgroundColor: coresSetores[setor.nome] }}
                                >
                                    {iconesSetores[setor.nome]}
                                </div>
                                <div className="paginaTutoriais__cardConteudo">
                                    <h2 className="paginaTutoriais__cardTitulo">{setor.nome}</h2>
                                    <p className="paginaTutoriais__cardDescricao">{setor.descricao}</p>
                                </div>
                                <div className="paginaTutoriais__cardFooter">
                                    <span className="paginaTutoriais__cardVideos">
                                        {setor.quantidadeVideos} {setor.quantidadeVideos === 1 ? "vídeo" : "vídeos"}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </section>
                )}
            </main>
        </div>
    );
}
