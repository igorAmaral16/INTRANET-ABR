import "./CartaoComunicado.css";
import { resolverUrlApi } from "../../utils/urlApi";
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

    const imageUrl = comunicado.anexo_tipo === "IMAGEM" && comunicado.anexo_url
        ? resolverUrlApi(comunicado.anexo_url)
        : null;

    return (
        <button
            type="button"
            className={`cartaoComunicado ${classePorImportancia(comunicado.importancia)} ${fixado ? "cartaoComunicado--fixado" : ""}`}
            onClick={() => aoAbrir(comunicado.id)}
            aria-label={`Abrir comunicado ${comunicado.titulo}`}
        >
            {imageUrl && (
                <div className="cartaoComunicado__imagemWrap">
                    <img src={imageUrl} alt={comunicado.titulo} className="cartaoComunicado__imagem" />
                </div>
            )}
            <div className="cartaoComunicado__accent" aria-hidden="true" />

            <div className="cartaoComunicado__conteudo">
                <div className="cartaoComunicado__cabecalho">
                    <h2 className="cartaoComunicado__titulo">{comunicado.titulo}</h2>
                    {fixado ? <span className="cartaoComunicado__badge">Fixado</span> : null}
                </div>

                {comunicado.descricao && (
                    <p className="cartaoComunicado__descricao">{comunicado.descricao}</p>
                )}

                <div className="cartaoComunicado__meta">
                    <span className="cartaoComunicado__chip">{comunicado.importancia}</span>
                    {comunicado.expira_em ? (
                        <span className="cartaoComunicado__expira">
                            Expira: <strong>{comunicado.expira_em}</strong>
                        </span>
                    ) : (
                        <span className="cartaoComunicado__expira cartaoComunicado__expira--ok">Sem data de expiração</span>
                    )}
                    {comunicado.confirmacoes_count != null && (
                        <span className="cartaoComunicado__confirmacoes">
                            {comunicado.confirmacoes_count} confirmaç{comunicado.confirmacoes_count === 1 ? "ão" : "ões"}
                        </span>
                    )}
                </div>

                <div className="cartaoComunicado__rodape">
                    <span className="cartaoComunicado__cta">Ver detalhes</span>
                    <span className="cartaoComunicado__seta" aria-hidden="true">
                        →
                    </span>
                </div>
            </div>
        </button>
    );
}
