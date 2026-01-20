import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
    Menu as IconMenu,
    X as IconX,
    SquarePen as IconPenSquare,
    FolderOpen as IconFolder,
    Users as IconUsers,
    HelpCircle as IconHelp,
    FileDown as IconReport,
    MessageSquare as IconMessage, // NOVO
    LogOut as IconLogout,
} from "lucide-react";
import "./MenuAdmin.css";

type Props = {
    aoCriarComunicado: () => void;
    aoDocumentos: () => void;
    aoColaboradores: () => void;
    aoFaq: () => void;
    aoRelatorios: () => void;
    aoFaleComRh: () => void; // NOVO
    aoSair: () => void;
};

type Item = {
    id: string;
    titulo: string;
    icon: React.ReactNode;
    onClick: () => void;
};

function Portal({ children }: { children: React.ReactNode }) {
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
}

export function MenuAdmin({
    aoCriarComunicado,
    aoDocumentos,
    aoColaboradores,
    aoFaq,
    aoRelatorios,
    aoFaleComRh,
    aoSair,
}: Props) {
    const [aberto, setAberto] = useState(false);

    const itens: Item[] = useMemo(
        () => [
            { id: "criar", titulo: "Criar comunicado", icon: <IconPenSquare size={18} />, onClick: aoCriarComunicado },
            { id: "docs", titulo: "Documentos", icon: <IconFolder size={18} />, onClick: aoDocumentos },
            { id: "colabs", titulo: "Colaboradores", icon: <IconUsers size={18} />, onClick: aoColaboradores },
            { id: "faq", titulo: "FAQ", icon: <IconHelp size={18} />, onClick: aoFaq },
            { id: "fale", titulo: "Fale com o RH", icon: <IconMessage size={18} />, onClick: aoFaleComRh }, // NOVO
            { id: "rel", titulo: "Gerar relatórios", icon: <IconReport size={18} />, onClick: aoRelatorios },
        ],
        [aoCriarComunicado, aoDocumentos, aoColaboradores, aoFaq, aoFaleComRh, aoRelatorios]
    );

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

    function clicarItem(item: Item) {
        setAberto(false);
        item.onClick();
    }

    function sair() {
        setAberto(false);
        aoSair();
    }

    return (
        <>
            <button
                className="menuAdmin__hambBotao"
                type="button"
                onClick={() => setAberto(true)}
                aria-label="Abrir menu administrativo"
            >
                <IconMenu size={20} />
            </button>

            {aberto ? (
                <Portal>
                    <div className="menuAdmin__overlayRoot" aria-hidden="false">
                        <div
                            className="menuAdmin__backdrop"
                            onMouseDown={() => setAberto(false)}
                            aria-hidden="true"
                        />

                        <aside className="menuAdmin__drawer" aria-label="Menu administrativo">
                            <div className="menuAdmin__drawerTopo">
                                <div>
                                    <div className="menuAdmin__drawerTitulo">Admin</div>
                                    <div className="menuAdmin__drawerSubtitulo">Ações do painel</div>
                                </div>

                                <button
                                    type="button"
                                    className="menuAdmin__drawerFechar"
                                    onClick={() => setAberto(false)}
                                    aria-label="Fechar menu"
                                >
                                    <IconX size={18} />
                                </button>
                            </div>

                            <div className="menuAdmin__drawerConteudo">
                                {itens.map((it) => (
                                    <button
                                        key={it.id}
                                        type="button"
                                        className="menuAdmin__item"
                                        onClick={() => clicarItem(it)}
                                    >
                                        <span className="menuAdmin__itemIcone">{it.icon}</span>
                                        <span className="menuAdmin__itemTexto">{it.titulo}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="menuAdmin__drawerRodape">
                                <button
                                    type="button"
                                    className="menuAdmin__item menuAdmin__itemSair"
                                    onClick={sair}
                                >
                                    <span className="menuAdmin__itemIcone">
                                        <IconLogout size={18} />
                                    </span>
                                    <span className="menuAdmin__itemTexto">Sair</span>
                                </button>
                            </div>
                        </aside>
                    </div>
                </Portal>
            ) : null}
        </>
    );
}
