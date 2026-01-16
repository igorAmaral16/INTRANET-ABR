import "./BarraTopo.css";
import { MenuUsuario } from "../MenuUsuario/MenuUsuario";
import logo from "../../assets/logo.webp";

type Props = {
    busca: string;
    aoMudarBusca: (v: string) => void;

    mostrarBusca?: boolean;

    // NOVO: clique na logo vai para a home
    aoIrParaInicio: () => void;

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
    mostrarBusca = true,
    aoIrParaInicio,
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
                <button
                    className="barraTopo__marca"
                    type="button"
                    aria-label="Ir para a página principal"
                    onClick={aoIrParaInicio}
                >
                    <img className="barraTopo__logoImg" src={logo} alt="Logo" />
                </button>

                {mostrarBusca ? (
                    <div className="barraTopo__busca">
                        <input
                            value={busca}
                            onChange={(e) => aoMudarBusca(e.target.value)}
                            placeholder="Pesquisar comunicados"
                            aria-label="Pesquisar comunicados"
                        />
                    </div>
                ) : (
                    <div className="barraTopo__espacador" />
                )}

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
