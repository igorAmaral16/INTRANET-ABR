import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotificacoesRh } from "../../contexts/NotificacoesRhContext";
import "./NotificacoesRhBell.css";

export function NotificacoesRhBell() {
    const { count, items, clear, removeConversation } = useNotificacoesRh();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!ref.current) return;
            if (!ref.current.contains(e.target as any)) setOpen(false);
        };
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, [open]);

    function abrirConversa(conversationId: string) {
        removeConversation(conversationId);
        setOpen(false);
        navigate("/fale-com-rh", { state: { openConversationId: conversationId } });
    }

    return (
        <div className="rhBell" ref={ref}>
            <button
                type="button"
                className="rhBell__btn"
                aria-label="Notificações do RH"
                onClick={() => setOpen((v) => !v)}
            >
                <Bell size={18} />
                {count > 0 ? <span className="rhBell__badge">{count > 99 ? "99+" : count}</span> : null}
            </button>

            {open ? (
                <div className="rhBell__popover" role="dialog" aria-label="Notificações">
                    <div className="rhBell__topo">
                        <div className="rhBell__titulo">Notificações</div>
                        <button type="button" className="rhBell__limpar" onClick={clear}>
                            Limpar
                        </button>
                    </div>

                    {items.length === 0 ? <div className="rhBell__vazio">Sem notificações.</div> : null}

                    {items.map((n) => (
                        <button
                            key={n.id}
                            type="button"
                            className="rhBell__item"
                            onClick={() => abrirConversa(n.conversationId)}
                        >
                            <div className="rhBell__itemLinha1">Mensagem do RH</div>
                            <div className="rhBell__itemLinha2">{n.preview}</div>
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
