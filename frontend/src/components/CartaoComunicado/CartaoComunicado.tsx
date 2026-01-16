import "./CartaoComunicado.css";
import type { ComunicadoResumo } from "../../tipos/comunicados";

type Props = {
    comunicado: ComunicadoResumo;
    aoAbrir: (id: number) => void;
};

function classePorImportancia(imp: string) {
    if (imp === "IMPORTANTE") return "cartaoComunicado--importante";
    if (imp === "RELEVANTE") return "cartaoComunicado--relevante";
    return "cartaoComunicado--pouco";
}

export function CartaoComunicado({ comunicado, aoAbrir }: Props) {
    const fixado = Boolean(comunicado.fixado_topo);

    return (
        <button
            type="button"
            className={`cartaoComunicado ${classePorImportancia(comunicado.importancia)}`}
            onClick={() => aoAbrir(comunicado.id)}
            aria-label={`Abrir comunicado ${comunicado.titulo}`}
        >
            <div className="cartaoComunicado__cabecalho">
                <h2 className="cartaoComunicado__titulo">
                    {comunicado.titulo}
                </h2>

                {fixado && <span className="cartaoComunicado__badge">FIXADO</span>}
            </div>

            <div className="cartaoComunicado__meta">
                <span className="cartaoComunicado__chip">{comunicado.importancia}</span>
                {comunicado.expira_em ? <span className="cartaoComunicado__expira">Expira: {comunicado.expira_em}</span> : null}
            </div>

            <p className="cartaoComunicado__texto">
                Clique para visualizar o comunicado completo.
            </p>
        </button>
    );
}
