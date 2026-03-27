import "./SidebarAdmin.css";
import { useNavigate } from "react-router-dom";
import {
    Menu as IconMenu,
    X as IconX,
    Video as IconVideo,
    Pencil as IconPen,
    FolderOpen as IconFolder,
    Users as IconUsers,
    Calendar as IconCalendar,
    HelpCircle as IconHelp,
    FileText as IconReport,
    MessageSquare as IconMessage,
    Image as IconImage,
    LogOut as IconLogout,
    Home as IconHome,
} from "lucide-react";
import { useState, useMemo } from "react";
import { setores } from "../../utils/setores";
import logo from "../../assets/logo.png";

type Props = {
    estaLogado: boolean;
    aoIrParaHome?: () => void;
    aoCriarComunicado?: () => void;
    aoDocumentos?: () => void;
    aoColaboradores?: () => void;
    aoCalendario?: () => void;
    aoFaq?: () => void;
    aoFaleComRh?: () => void;
    aoRelatorios?: () => void;
    aoCarrossel?: () => void;
    aoSair?: () => void;
};

export function SidebarAdmin({
    estaLogado,
    aoIrParaHome,
    aoCriarComunicado,
    aoDocumentos,
    aoColaboradores,
    aoCalendario,
    aoFaq,
    aoFaleComRh,
    aoRelatorios,
    aoCarrossel,
    aoSair,
}: Props) {
    const navigate = useNavigate();
    const [submenuTutoriaisAberto, setSubmenuTutoriaisAberto] = useState(false);
    const [mobileAberto, setMobileAberto] = useState(false);

    const handleHome = aoIrParaHome || (() => navigate("/admin/home"));
    const handleCriarComunicado = aoCriarComunicado || (() => navigate("/admin/criar-comunicado"));
    const handleDocs = aoDocumentos || (() => navigate("/admin/documentos"));
    const handleColabs = aoColaboradores || (() => navigate("/admin/colaboradores"));
    const handleCalendario = aoCalendario || (() => navigate("/admin/calendario"));
    const handleFaq = aoFaq || (() => navigate("/admin/faq"));
    const handleFaleComRh = aoFaleComRh || (() => navigate("/admin/fale-com-rh"));
    const handleRelatorios = aoRelatorios || (() => navigate("/admin/relatorios"));
    const handleCarrossel = aoCarrossel || (() => navigate("/admin/carousel"));

    function navegarSetorTutorial(setor: string) {
        setSubmenuTutoriaisAberto(false);
        setMobileAberto(false);
        navigate(`/admin/tutoriais/${encodeURIComponent(setor)}`);
    }

    const itens = useMemo(
        () => {
            const base: Array<{
                id: string;
                titulo: string;
                icon: React.ReactNode;
                onClick: () => void;
            }> = [];

            if (estaLogado) {
                base.push(
                    {
                        id: "home",
                        titulo: "Página Inicial",
                        icon: <IconHome size={20} />,
                        onClick: handleHome,
                    },
                    {
                        id: "criar",
                        titulo: "Criar comunicado",
                        icon: <IconPen size={20} />,
                        onClick: handleCriarComunicado,
                    },
                    {
                        id: "carousel",
                        titulo: "Carrossel",
                        icon: <IconImage size={20} />,
                        onClick: handleCarrossel,
                    },
                    {
                        id: "docs",
                        titulo: "Documentos",
                        icon: <IconFolder size={20} />,
                        onClick: handleDocs,
                    },
                    {
                        id: "colabs",
                        titulo: "Colaboradores",
                        icon: <IconUsers size={20} />,
                        onClick: handleColabs,
                    },
                    {
                        id: "faq",
                        titulo: "FAQ",
                        icon: <IconHelp size={20} />,
                        onClick: handleFaq,
                    },
                    {
                        id: "fale",
                        titulo: "Fale com RH",
                        icon: <IconMessage size={20} />,
                        onClick: handleFaleComRh,
                    },
                    {
                        id: "relatorios",
                        titulo: "Gerar relatórios",
                        icon: <IconReport size={20} />,
                        onClick: handleRelatorios,
                    },
                    {
                        id: "tutoriais",
                        titulo: "Tutoriais",
                        icon: <IconVideo size={20} />,
                        onClick: () => {
                            setSubmenuTutoriaisAberto((v) => !v);
                        },
                    },
                    {
                        id: "calendario",
                        titulo: "Calendário",
                        icon: <IconCalendar size={20} />,
                        onClick: handleCalendario,
                    },
                    {
                        id: "sair",
                        titulo: "Sair",
                        icon: <IconLogout size={20} />,
                        onClick: () => {
                            aoSair?.();
                            setMobileAberto(false);
                        },
                    }
                );
            }

            return base;
        },
        [estaLogado, handleHome, handleCriarComunicado, handleDocs, handleColabs, handleCalendario, handleFaq, handleFaleComRh, handleRelatorios, handleCarrossel, aoSair]
    );

    return (
        <>
            {/* Sidebar Desktop */}
            <aside className="sidebarAdmin sidebarAdmin--desktop">
                <div className="sidebarAdmin__logo">
                    <img src={logo} alt="Logo" className="sidebarAdmin__logoImg" />
                </div>

                <nav className="sidebarAdmin__nav">
                    {itens.map((item) => (
                        <div key={item.id}>
                            <button
                                type="button"
                                className={`sidebarAdmin__item ${item.id === "sair" ? "sidebarAdmin__item--sair" : ""}`}
                                onClick={item.onClick}
                                title={item.titulo}
                            >
                                <span className="sidebarAdmin__itemIcon">{item.icon}</span>
                                <span className="sidebarAdmin__itemLabel">{item.titulo}</span>
                            </button>

                            {item.id === "tutoriais" && submenuTutoriaisAberto && (
                                <div className="sidebarAdmin__submenu">
                                    {setores.map((setor) => (
                                        <button
                                            key={setor}
                                            type="button"
                                            className="sidebarAdmin__submenuItem"
                                            onClick={() => navegarSetorTutorial(setor)}
                                        >
                                            {setor}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Sidebar Mobile */}
            <div className="sidebarAdmin--mobile">
                <button
                    className="sidebarAdmin__hambBotao"
                    type="button"
                    onClick={() => setMobileAberto(true)}
                    aria-label="Abrir menu administrativo"
                >
                    <IconMenu size={20} />
                </button>

                {mobileAberto && (
                    <>
                        <div
                            className="sidebarAdmin__backdrop"
                            onClick={() => setMobileAberto(false)}
                        />
                        <aside className="sidebarAdmin__drawer">
                            <div className="sidebarAdmin__drawerTopo">
                                <h2 className="sidebarAdmin__drawerTitulo">Menu Admin</h2>
                                <button
                                    type="button"
                                    className="sidebarAdmin__fechar"
                                    onClick={() => setMobileAberto(false)}
                                    aria-label="Fechar menu"
                                >
                                    <IconX size={18} />
                                </button>
                            </div>

                            <nav className="sidebarAdmin__drawerNav">
                                {itens.map((item) => (
                                    <div key={item.id}>
                                        <button
                                            type="button"
                                            className={`sidebarAdmin__drawerItem ${item.id === "sair" ? "sidebarAdmin__drawerItem--sair" : ""
                                                }`}
                                            onClick={item.onClick}
                                        >
                                            <span className="sidebarAdmin__drawerItemIcon">{item.icon}</span>
                                            <span className="sidebarAdmin__drawerItemLabel">{item.titulo}</span>
                                        </button>

                                        {item.id === "tutoriais" && submenuTutoriaisAberto && (
                                            <div className="sidebarAdmin__drawerSubmenu">
                                                {setores.map((setor) => (
                                                    <button
                                                        key={setor}
                                                        type="button"
                                                        className="sidebarAdmin__drawerSubmenuItem"
                                                        onClick={() => navegarSetorTutorial(setor)}
                                                    >
                                                        {setor}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </nav>
                        </aside>
                    </>
                )}
            </div>
        </>
    );
}
