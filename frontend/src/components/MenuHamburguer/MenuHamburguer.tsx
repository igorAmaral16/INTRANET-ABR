import { useEffect } from "react";
import "./MenuHamburguer.css";

type Props = {
    aberto: boolean;
    aoAbrir: () => void;
    aoFechar: () => void;
    aoSair: () => void;
};

export function MenuHamburguer({ aberto, aoAbrir, aoFechar, aoSair }: Props) {
    useEffect(() => {
        if (!aberto) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") aoFechar();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [aberto, aoFechar]);

    return (
        <>
            <button className="hamb__botao" type="button" onClick={aoAbrir} aria-label="Abrir menu">
                <span />
                <span />
                <span />
            </button>

            <div className={`hamb__backdrop ${aberto ? "is-open" : ""}`} onMouseDown={aoFechar} />

            <aside className={`hamb__drawer ${aberto ? "is-open" : ""}`} aria-label="Menu do colaborador">
                <div className="hamb__topo">
                    <strong>Menu</strong>
                    <button type="button" onClick={aoFechar} className="hamb__fechar" aria-label="Fechar menu">✕</button>
                </div>

                <nav className="hamb__lista">
                    <button type="button" className="hamb__item" onClick={() => { aoFechar(); alert("Meu Perfil (próxima tela)"); }}>
                        Meu Perfil
                    </button>
                    <button type="button" className="hamb__item" onClick={() => { aoFechar(); alert("Ver Documentos (próxima tela)"); }}>
                        Ver Documentos
                    </button>
                    <button type="button" className="hamb__item" onClick={() => { aoFechar(); alert("Dúvidas Frequentes (FAQ)"); }}>
                        Dúvidas Frequentes (FAQ)
                    </button>
                    <button type="button" className="hamb__item" onClick={() => { aoFechar(); alert("Fale com o RH (última feature)"); }}>
                        Fale com o RH
                    </button>

                    <div className="hamb__separador" />

                    <button type="button" className="hamb__item sair" onClick={() => { aoFechar(); aoSair(); }}>
                        Sair
                    </button>
                </nav>
            </aside>
        </>
    );
}
