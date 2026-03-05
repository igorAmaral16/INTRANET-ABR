import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
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
} from "lucide-react";
import { setores } from "../../utils/setores";
import "./MenuPublic.css";

function Portal({ children }: { children: React.ReactNode }) {
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
}


export function MenuPublic({
    estaLogado,
    role,

    aoClicarEntrar,
    aoMeuPerfil,
    aoVerDocumentos,
    aoMeusDocumentos,
    aoCalendario,
    aoFaq,
    aoFaleComRh,
    aoSair,
}: {
    estaLogado: boolean;
    role: "COLAB" | "ADMIN" | null;

    aoClicarEntrar?: () => void;
    // usuario
    aoMeuPerfil?: () => void;
    aoVerDocumentos?: () => void;
    aoMeusDocumentos?: () => void;
    aoCalendario?: () => void;
    aoFaq?: () => void;
    aoFaleComRh?: () => void;
    aoSair?: () => void;
}) {
    const [aberto, setAberto] = useState(false);
    const [submenuTutoriais, setSubmenuTutoriais] = useState(false);


    useEffect(() => {
        if (!aberto) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setAberto(false);
        };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [aberto]);

    function navegarSetor(setor: string) {
        setAberto(false);
        const prefix = role === "ADMIN" ? "/admin" : "";
        window.location.href = `${prefix}/tutoriais/${encodeURIComponent(setor)}`;
    }

    const itens = useMemo(() => {
        const base: Array<{
            id: string;
            titulo: string;
            icon: React.ReactNode;
            onClick: () => void;
        }> = [];

        const wrap = (fn?: () => void) => () => {
            setAberto(false);
            fn && fn();
        };

        // always show tutorials toggle
        base.push({
            id: "tutoriais",
            titulo: "Tutoriais",
            icon: <IconVideo size={18} />,
            onClick: () => {
                if (role === "ADMIN") {
                    // admin wants to see sector list
                    setAberto(false);
                    window.location.href = "/admin/tutoriais";
                } else {
                    setSubmenuTutoriais((v) => !v);
                }
            },
        });

        if (!estaLogado) {
            // login button only in public state
            base.push({
                id: "entrar",
                titulo: "Entrar",
                icon: <IconUser size={18} />,
                onClick: wrap(aoClicarEntrar),
            });
        } else {
            // append private actions when logged
            base.push(
                { id: "perfil", titulo: "Meu Perfil", icon: <IconUser size={18} />, onClick: wrap(aoMeuPerfil) },
                { id: "verDocs", titulo: "Ver Meus Documentos", icon: <IconFolder size={18} />, onClick: wrap(aoVerDocumentos) },
                ...(aoMeusDocumentos ? [{ id: "meusDocs", titulo: "Meus Documentos", icon: <IconFolder size={18} />, onClick: wrap(aoMeusDocumentos) }] : []),
                { id: "calendario", titulo: "Calendário", icon: <IconCalendar size={18} />, onClick: wrap(aoCalendario) },
                { id: "faq", titulo: "FAQ", icon: <IconHelp size={18} />, onClick: wrap(aoFaq) },
                { id: "fale", titulo: "Fale com o RH", icon: <IconMessage size={18} />, onClick: wrap(aoFaleComRh) }
            );

            base.push({ id: "sair", titulo: "Sair", icon: <IconLogout size={18} />, onClick: wrap(aoSair) });
        }

        return base;
    }, [estaLogado, role, aoMeuPerfil, aoVerDocumentos, aoMeusDocumentos, aoCalendario, aoFaq, aoFaleComRh, aoSair]);

    return (
        <>
            <button
                className="menuPublic__hambBotao"
                type="button"
                onClick={() => setAberto(true)}
                aria-label="Abrir menu"
            >
                <IconMenu size={20} />
            </button>

            {aberto ? (
                <Portal>
                    <div className="menuPublic__overlayRoot" aria-hidden="false">
                        <div
                            className="menuPublic__backdrop"
                            onMouseDown={() => setAberto(false)}
                            aria-hidden="true"
                        />

                        <aside className="menuPublic__drawer" aria-label="Menu">
                            <div className="menuPublic__drawerTopo">
                                <div>
                                    <div className="menuPublic__drawerTitulo">Menu</div>
                                </div>

                                <button
                                    type="button"
                                    className="menuPublic__drawerFechar"
                                    onClick={() => setAberto(false)}
                                    aria-label="Fechar menu"
                                >
                                    <IconX size={18} />
                                </button>
                            </div>

                            <div className="menuPublic__drawerConteudo">
                                {itens.map((it) => (
                                    <div key={it.id}>
                                        <button
                                            type="button"
                                            className={
                                                `menuPublic__item ${it.id === "sair"
                                                    ? "menuPublic__itemSair"
                                                    : it.id === "entrar"
                                                        ? "menuPublic__itemEntrar"
                                                        : ""
                                                }`
                                            }
                                            onClick={it.onClick}
                                        >
                                            <span className="menuPublic__itemIcone">{it.icon}</span>
                                            <span className="menuPublic__itemTexto">{it.titulo}</span>
                                        </button>

                                        {/* insert submenu immediately after Tutoriais button */}
                                        {it.id === "tutoriais" && submenuTutoriais && (
                                            <div className="menuPublic__submenu">
                                                {setores.map((s) => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        className="menuPublic__item submenu"
                                                        onClick={() => navegarSetor(s)}
                                                    >
                                                        <span className="menuPublic__itemIcone">
                                                            <IconVideo size={18} />
                                                        </span>
                                                        <span className="menuPublic__itemTexto">{s}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </aside>
                    </div>
                </Portal>
            ) : null}
        </>
    );
}
