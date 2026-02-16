import { useEffect } from "react";
import "./Modal.css";

type Props = {
    aberto: boolean;
    titulo: string;
    children: React.ReactNode;
    aoFechar: () => void;
};

export function Modal({ aberto, titulo, children, aoFechar }: Props) {
    useEffect(() => {
        if (!aberto) return;

        // Travar scroll do body quando modal está aberto
        document.body.style.overflow = "hidden";

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") aoFechar();
        };

        window.addEventListener("keydown", onKey);
        
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [aberto, aoFechar]);

    if (!aberto) return null;

    return (
        <div className="modal__backdrop" role="dialog" aria-modal="true" aria-label={titulo} onMouseDown={aoFechar}>
            <div className="modal__conteudo" onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal__topo">
                    <h3 className="modal__titulo">{titulo}</h3>
                    <button className="modal__fechar" type="button" onClick={aoFechar} aria-label="Fechar">
                        ✕
                    </button>
                </div>
                <div className="modal__corpo" ref={(el) => el && (el.scrollTop = 0)}>{children}</div>
            </div>
        </div>
    );
}
