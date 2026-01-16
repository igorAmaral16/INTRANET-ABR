import { MenuUsuario } from "../MenuUsuario/MenuUsuario";
import "./BarraTopo.css";

type Props = {
    busca: string;
    aoMudarBusca: (v: string) => void;

    estaLogadoColab: boolean;

    aoClicarEntrar: () => void;

    aoMeuPerfil: () => void;
    aoVerDocumentos: () => void;
    aoFaq: () => void;
    aoFaleComRh: () => void;
    aoSair: () => void;
};

export function BarraTopo({
    busca,
    aoMudarBusca,
    estaLogadoColab,
    aoClicarEntrar,
    aoMeuPerfil,
    aoVerDocumentos,
    aoFaq,
    aoFaleComRh,
    aoSair,
}: Props) {
    return (
        <header className="barraTopo">
            <div className="barraTopo__conteudo">
                <div className="barraTopo__marca" aria-label="Marca">
                    <span className="barraTopo__logo">ABR</span>
                </div>

                <div className="barraTopo__busca">
                    <input
                        value={busca}
                        onChange={(e) => aoMudarBusca(e.target.value)}
                        placeholder="Pesquisar comunicados"
                        aria-label="Pesquisar comunicados"
                    />
                </div>

                <div className="barraTopo__acoesDireita">
                    {!estaLogadoColab ? (
                        <button className="barraTopo__botaoEntrar" onClick={aoClicarEntrar} type="button">
                            Entrar
                        </button>
                    ) : (
                        <MenuUsuario
                            aoMeuPerfil={aoMeuPerfil}
                            aoVerDocumentos={aoVerDocumentos}
                            aoFaq={aoFaq}
                            aoFaleComRh={aoFaleComRh}
                            aoSair={aoSair}
                        />
                    )}
                </div>
            </div>
        </header>
    );
}
