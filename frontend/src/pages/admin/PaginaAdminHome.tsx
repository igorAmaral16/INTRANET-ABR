import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useSessaoAuth } from "../../hooks/useSessaoAuth";
import {
    Bell,
    FolderOpen,
    Users,
    HelpCircle,
    MessageSquare,
    BarChart3,
    Video,
    Sparkles,
    Calendar,
    LogOut,
} from "lucide-react";
import "./PaginaAdminHome.css";

interface MenuCard {
    id: string;
    titulo: string;
    descricao: string;
    icon: React.ReactNode;
    rota: string;
}

export function PaginaAdminHome() {
    const navigate = useNavigate();
    const { sessao, sair } = useSessaoAuth();

    // Validar se é admin
    useEffect(() => {
        if (sessao && sessao.role !== "ADMIN") {
            navigate("/", { replace: true });
        }
    }, [sessao, navigate]);

    const nomeUsuario = sessao?.user?.nome || sessao?.user?.username || "Administrador";

    // Total de cards do painel admin - baseado em MenuAdmin.tsx
    const cards: MenuCard[] = [
        {
            id: "comunicados",
            titulo: "Comunicados",
            descricao: "Listar e criar comunicados",
            icon: <Bell size={32} />,
            rota: "/admin/comunicados",
        },
        {
            id: "carousel",
            titulo: "Carrossel",
            descricao: "Gerenciar slides na página inicial",
            icon: <Sparkles size={32} />,
            rota: "/admin/carousel",
        },
        {
            id: "documentos",
            titulo: "Documentos",
            descricao: "Gerenciar biblioteca de arquivos",
            icon: <FolderOpen size={32} />,
            rota: "/admin/documentos",
        },
        {
            id: "colaboradores",
            titulo: "Colaboradores",
            descricao: "Gerenciar dados e acessos",
            icon: <Users size={32} />,
            rota: "/admin/colaboradores",
        },
        {
            id: "faq",
            titulo: "FAQ",
            descricao: "Gerenciar perguntas frequentes",
            icon: <HelpCircle size={32} />,
            rota: "/admin/faq",
        },
        {
            id: "faleComRh",
            titulo: "Fale com o RH",
            descricao: "Gerenciar conversas com colaboradores",
            icon: <MessageSquare size={32} />,
            rota: "/admin/fale-com-rh",
        },
        {
            id: "relatorios",
            titulo: "Gerar relatórios",
            descricao: "Exportar dados e estatísticas",
            icon: <BarChart3 size={32} />,
            rota: "/admin/relatorios",
        },
        {
            id: "tutoriais",
            titulo: "Tutoriais",
            descricao: "Gerenciar vídeos por setor",
            icon: <Video size={32} />,
            rota: "/admin/tutoriais",
        },
        {
            id: "calendario",
            titulo: "Calendário",
            descricao: "Gerenciar eventos e feriados",
            icon: <Calendar size={32} />,
            rota: "/admin/calendario",
        },
    ];

    return (
        <div className="paginaAdminHome">
            {/* HEADER */}
            <header className="paginaAdminHome__header">
                <div className="paginaAdminHome__headerConteudo">
                    <div className="paginaAdminHome__headerInfo">
                        <h1 className="paginaAdminHome__headerTitulo">Painel Administrativo</h1>
                        <p className="paginaAdminHome__headerSubtitulo">
                            Bem-vindo, <strong>{nomeUsuario}</strong>
                        </p>
                    </div>

                    <button
                        className="paginaAdminHome__btnSair"
                        type="button"
                        onClick={() => {
                            sair();
                            navigate("/", { replace: true });
                        }}
                        title="Fazer logout"
                    >
                        <LogOut size={20} />
                        <span>Sair</span>
                    </button>
                </div>
            </header>

            {/* CONTEÚDO */}
            <main className="paginaAdminHome__main">
                <div className="paginaAdminHome__container">
                    <section className="paginaAdminHome__secao">
                        <p className="paginaAdminHome__secaoDesc">
                            Escolha uma opção para começar a gerenciar o painel administrativo
                        </p>

                        <div className="paginaAdminHome__grid">
                            {cards.map((card) => (
                                <button
                                    key={card.id}
                                    className="paginaAdminHome__card"
                                    onClick={() => navigate(card.rota)}
                                    type="button"
                                >
                                    <div className="paginaAdminHome__cardIcon">{card.icon}</div>
                                    <h2 className="paginaAdminHome__cardTitulo">{card.titulo}</h2>
                                    <p className="paginaAdminHome__cardDesc">{card.descricao}</p>
                                    <div className="paginaAdminHome__cardSeta">→</div>
                                </button>
                            ))}
                        </div>
                    </section>
                </div>
            </main>

            {/* FOOTER */}
            <footer className="paginaAdminHome__footer">
                <p className="paginaAdminHome__footerTexto">
                    © 2026 ABR — Painel Administrativo. Todos os direitos reservados.
                </p>
            </footer>
        </div>
    );
}
