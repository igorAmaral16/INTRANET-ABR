import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
    Menu as IconMenu,
    X as IconX,
    User as IconUser,
    FolderOpen as IconFolder,
    HelpCircle as IconHelp,
    MessageSquare as IconMessage,
    LogOut as IconLogout,
} from "lucide-react";
import "./MenuUsuario.css";

type Props = {
    aoMeuPerfil: () => void;
    aoVerDocumentos: () => void;
    aoFaq: () => void;
    aoFaleComRh: () => void;
    aoSair: () => void;
};

type Item = {
    id: string;
    titulo: string;
    icon: ReactNode;
    onClick: () => void;
};

function Portal({ children }: { children: ReactNode }) {
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
}

export function MenuUsuario({
    aoMeuPerfil,
    aoVerDocumentos,
    aoFaq,
    aoFaleComRh,
    aoSair,
}: Props) {
    const [abertoMobile, setAbertoMobile] = useState(false);

    const itens: Item[] = useMemo(
        () => [
            { id: "perfil", titulo: "Meu Perfil", icon: <IconUser size={18} />, onClick: aoMeuPerfil },
            { id: "docs", titulo: "Ver Documentos", icon: <IconFolder size={18} />, onClick: aoVerDocumentos },
            { id: "faq", titulo: "Dúvidas Frequentes (FAQ)", icon: <IconHelp size={18} />, onClick: aoFaq },
            { id: "fale", titulo: "Fale com o RH", icon: <IconMessage size={18} />, onClick: aoFaleComRh },
        ],
        [aoMeuPerfil, aoVerDocumentos, aoFaq, aoFaleComRh]
    );

    useEffect(() => {
        if (!abertoMobile) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setAbertoMobile(false);
        };

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [abertoMobile]);

    function clicarItem(item: Item) {
        setAbertoMobile(false);
        item.onClick();
    }

    function sair() {
        setAbertoMobile(false);
        aoSair();
    }

    return (
        <>
            <nav className="menuUsuario__desktop" aria-label="Menu do usuário">
                {itens.map((it) => (
                    <button
                        key={it.id}
                        type="button"
                        className="menuUsuario__botaoTopo"
                        onClick={it.onClick}
                        aria-label={it.titulo}
                    >
                        <span className="menuUsuario__icone">{it.icon}</span>
                        <span className="menuUsuario__texto">{it.titulo}</span>
                    </button>
                ))}

                <button
                    type="button"
                    className="menuUsuario__botaoTopo menuUsuario__sairTopo"
                    onClick={aoSair}
                    aria-label="Sair"
                >
                    <span className="menuUsuario__icone">
                        <IconLogout size={18} />
                    </span>
                    <span className="menuUsuario__texto">Sair</span>
                </button>
            </nav>

            <button
                className="menuUsuario__hambBotao"
                type="button"
                onClick={() => setAbertoMobile(true)}
                aria-label="Abrir menu"
            >
                <IconMenu size={20} />
            </button>

            {abertoMobile ? (
                <Portal>
                    <div className="menuUsuario__overlayRoot" aria-hidden="false">
                        <div
                            className="menuUsuario__backdrop"
                            onMouseDown={() => setAbertoMobile(false)}
                            aria-hidden="true"
                        />

                        <aside className="menuUsuario__drawer" aria-label="Menu do usuário">
                            <div className="menuUsuario__drawerTopo">
                                <div>
                                    <div className="menuUsuario__drawerTitulo">Menu</div>
                                    <div className="menuUsuario__drawerSubtitulo">Acesso rápido</div>
                                </div>

                                <button
                                    type="button"
                                    className="menuUsuario__drawerFechar"
                                    onClick={() => setAbertoMobile(false)}
                                    aria-label="Fechar menu"
                                >
                                    <IconX size={18} />
                                </button>
                            </div>

                            <div className="menuUsuario__drawerConteudo">
                                {itens.map((it) => (
                                    <button
                                        key={it.id}
                                        type="button"
                                        className="menuUsuario__item"
                                        onClick={() => clicarItem(it)}
                                    >
                                        <span className="menuUsuario__itemIcone">{it.icon}</span>
                                        <span className="menuUsuario__itemTexto">{it.titulo}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="menuUsuario__drawerRodape">
                                <button
                                    type="button"
                                    className="menuUsuario__item menuUsuario__itemSair"
                                    onClick={sair}
                                >
                                    <span className="menuUsuario__itemIcone">
                                        <IconLogout size={18} />
                                    </span>
                                    <span className="menuUsuario__itemTexto">Sair</span>
                                </button>
                            </div>
                        </aside>
                    </div>
                </Portal>
            ) : null}
        </>
    );
}
