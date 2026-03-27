import "./SidebarFixed.css";
import { useNavigate } from "react-router-dom";
import {
    Menu as IconMenu,
    X as IconX,
    Video as IconVideo,
    User as IconUser,
    FolderOpen as IconFolder,
    Calendar as IconCalendar,
    HelpCircle as IconHelp,
    MessageSquare as IconMessage,
    LogOut as IconLogout,
    Home as IconHome,
    Bell as IconBell,
    Settings as IconSettings,
} from "lucide-react";
import { useState, useMemo } from "react";
import { setores } from "../../utils/setores";
import logo from "../../assets/logo.png";

type Role = "COLAB" | "ADMIN" | null | undefined;

type Props = {
    estaLogado: boolean;
    role?: Role;

    aoIrParaHome?: () => void;
    aoMeuPerfil?: () => void;
    aoVerDocumentos?: () => void;
    aoMeusDocumentos?: () => void;
    aoCalendario?: () => void;
    aoFaq?: () => void;
    aoFaleComRh?: () => void;
    aoComunicados?: () => void;
    aoAcessarPainel?: () => void;

    aoClicarEntrar?: () => void;
    aoSair?: () => void;
};

export function SidebarFixed({
    estaLogado,
    role,
    aoIrParaHome,
    aoMeuPerfil,
    aoVerDocumentos,
    aoMeusDocumentos,
    aoCalendario,
    aoFaq,
    aoFaleComRh,
    aoComunicados,
    aoAcessarPainel,
    aoClicarEntrar,
    aoSair,
}: Props) {
    const navigate = useNavigate();
    const [submenuTutoriaisAberto, setSubmenuTutoriaisAberto] = useState(false);
    const [mobileAberto, setMobileAberto] = useState(false);

    const handleHome = aoIrParaHome || (() => navigate("/"));
    const handleMeuPerfil = aoMeuPerfil || (() => navigate("/meu-perfil"));
    const handleVerDocs = aoVerDocumentos || (() => navigate("/documentos"));
    const handleMeusDocs = aoMeusDocumentos || (() => navigate("/meus-documentos"));
    const handleCalendario = aoCalendario || (() => navigate("/calendario"));
    const handleFaq = aoFaq || (() => navigate("/faq"));
    const handleFale = aoFaleComRh || (() => navigate("/fale-com-rh"));
    const handleComunicados = aoComunicados || (() => navigate("/comunicados"));
    const handlePainel = aoAcessarPainel || (() => navigate("/admin"));

    function navegarSetor(setor: string) {
        setSubmenuTutoriaisAberto(false);
        setMobileAberto(false);
        const prefix = role === "ADMIN" ? "/admin" : "";
        window.location.href = `${prefix}/tutoriais/${encodeURIComponent(setor)}`;
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
                        id: "comunicados",
                        titulo: "Comunicados",
                        icon: <IconBell size={20} />,
                        onClick: handleComunicados,
                    }
                );
            }

            base.push({
                id: "tutoriais",
                titulo: "Tutoriais",
                icon: <IconVideo size={20} />,
                onClick: () => {
                    if (role === "ADMIN") {
                        setMobileAberto(false);
                        window.location.href = "/admin/tutoriais";
                    } else {
                        setSubmenuTutoriaisAberto((v) => !v);
                    }
                },
            });

            if (!estaLogado) {
                base.push({
                    id: "entrar",
                    titulo: "Entrar",
                    icon: <IconUser size={20} />,
                    onClick: () => {
                        aoClicarEntrar?.();
                        setMobileAberto(false);
                    },
                });
            } else {
                base.push(
                    {
                        id: "perfil",
                        titulo: "Meu Perfil",
                        icon: <IconUser size={20} />,
                        onClick: () => {
                            handleMeuPerfil();
                            setMobileAberto(false);
                        },
                    },
                    {
                        id: "docs",
                        titulo: "Documentos",
                        icon: <IconFolder size={20} />,
                        onClick: () => {
                            handleVerDocs();
                            setMobileAberto(false);
                        },
                    }
                );

                if (aoMeusDocumentos) {
                    base.push({
                        id: "meusDocs",
                        titulo: "Meus Documentos",
                        icon: <IconFolder size={20} />,
                        onClick: () => {
                            handleMeusDocs();
                            setMobileAberto(false);
                        },
                    });
                }

                base.push(
                    {
                        id: "calendario",
                        titulo: "Calendário",
                        icon: <IconCalendar size={20} />,
                        onClick: () => {
                            handleCalendario();
                            setMobileAberto(false);
                        },
                    },
                    {
                        id: "faq",
                        titulo: "FAQ",
                        icon: <IconHelp size={20} />,
                        onClick: () => {
                            handleFaq();
                            setMobileAberto(false);
                        },
                    },
                    {
                        id: "fale",
                        titulo: "Fale com RH",
                        icon: <IconMessage size={20} />,
                        onClick: () => {
                            handleFale();
                            setMobileAberto(false);
                        },
                    }
                );

                if (role === "ADMIN") {
                    base.push({
                        id: "painel",
                        titulo: "Painel Admin",
                        icon: <IconSettings size={20} />,
                        onClick: () => {
                            handlePainel();
                            setMobileAberto(false);
                        },
                    });
                }

                base.push({
                    id: "sair",
                    titulo: "Sair",
                    icon: <IconLogout size={20} />,
                    onClick: () => {
                        aoSair?.();
                        setMobileAberto(false);
                    },
                });
            }

            return base;
        },
        [estaLogado, role]
    );

    return (
        <>
            {/* Sidebar Desktop */}
            <aside className="sidebarFixed sidebarFixed--desktop">
                <div className="sidebarFixed__logo">
                    <img src={logo} alt="Logo" className="sidebarFixed__logoImg" />
                </div>

                <nav className="sidebarFixed__nav">
                    {itens.map((item) => (
                        <div key={item.id}>
                            <button
                                type="button"
                                className={`sidebarFixed__item ${item.id === "sair"
                                    ? "sidebarFixed__item--sair"
                                    : item.id === "entrar"
                                        ? "sidebarFixed__item--entrar"
                                        : ""
                                    }`}
                                onClick={item.onClick}
                                title={item.titulo}
                            >
                                <span className="sidebarFixed__itemIcon">{item.icon}</span>
                                <span className="sidebarFixed__itemLabel">{item.titulo}</span>
                            </button>

                            {item.id === "tutoriais" && submenuTutoriaisAberto && (
                                <div className="sidebarFixed__submenu">
                                    {setores.map((setor) => (
                                        <button
                                            key={setor}
                                            type="button"
                                            className="sidebarFixed__submenuItem"
                                            onClick={() => navegarSetor(setor)}
                                        >
                                            <span className="sidebarFixed__submenuIcon">
                                                <IconVideo size={16} />
                                            </span>
                                            <span className="sidebarFixed__submenuLabel">{setor}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Botão Mobile */}
            <button
                className="sidebarFixed__mobileToggle sidebarFixed--mobileOnly"
                type="button"
                onClick={() => setMobileAberto(!mobileAberto)}
                aria-label="Abrir menu"
            >
                <IconMenu size={24} />
            </button>

            {/* Sidebar Mobile */}
            {mobileAberto && (
                <>
                    <div
                        className="sidebarFixed__mobileBackdrop"
                        onClick={() => setMobileAberto(false)}
                    />
                    <aside className="sidebarFixed sidebarFixed--mobile">
                        <div className="sidebarFixed__mobileHeader">
                            <div className="sidebarFixed__logo">
                                <img src={logo} alt="Logo" className="sidebarFixed__logoImg" />
                            </div>
                            <button
                                type="button"
                                className="sidebarFixed__mobileClose"
                                onClick={() => setMobileAberto(false)}
                                aria-label="Fechar menu"
                            >
                                <IconX size={24} />
                            </button>
                        </div>

                        <nav className="sidebarFixed__nav">
                            {itens.map((item) => (
                                <div key={item.id}>
                                    <button
                                        type="button"
                                        className={`sidebarFixed__item ${item.id === "sair"
                                            ? "sidebarFixed__item--sair"
                                            : item.id === "entrar"
                                                ? "sidebarFixed__item--entrar"
                                                : ""
                                            }`}
                                        onClick={item.onClick}
                                    >
                                        <span className="sidebarFixed__itemIcon">{item.icon}</span>
                                        <span className="sidebarFixed__itemLabel">{item.titulo}</span>
                                    </button>

                                    {item.id === "tutoriais" && submenuTutoriaisAberto && (
                                        <div className="sidebarFixed__submenu">
                                            {setores.map((setor) => (
                                                <button
                                                    key={setor}
                                                    type="button"
                                                    className="sidebarFixed__submenuItem"
                                                    onClick={() => navegarSetor(setor)}
                                                >
                                                    <span className="sidebarFixed__submenuLabel">{setor}</span>
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
        </>
    );
}
