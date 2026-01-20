import "./BarraTopo.css";
import { MenuUsuario } from "../MenuUsuario/MenuUsuario";
import { MenuAdmin } from "../MenuAdmin/MenuAdmin";
import logo from "../../assets/logo.webp";
import { NotificacoesRhBell } from "../NotificacoesRhBell/NotificacoesRhBell"; // NOVO

type Role = "COLAB" | "ADMIN" | null | undefined;

type Props = {
    busca: string;
    aoMudarBusca: (v: string) => void;
    mostrarBusca?: boolean;

    aoIrParaInicio: () => void;

    estaLogado: boolean;
    role?: Role;

    aoClicarEntrar: () => void;

    // COLAB
    aoMeuPerfil?: () => void;
    aoVerDocumentos?: () => void;
    aoFaq?: () => void;
    aoFaleComRh?: () => void;

    // ADMIN
    aoAdminCriarComunicado?: () => void;
    aoAdminDocumentos?: () => void;
    aoAdminColaboradores?: () => void;
    aoAdminFaq?: () => void;
    aoAdminRelatorios?: () => void;
    aoAdminFaleComRh?: () => void;

    aoSair: () => void;
};

export function BarraTopo({
    busca,
    aoMudarBusca,
    mostrarBusca = true,
    aoIrParaInicio,
    estaLogado,
    role,
    aoClicarEntrar,

    aoMeuPerfil,
    aoVerDocumentos,
    aoFaq,
    aoFaleComRh,

    aoAdminCriarComunicado,
    aoAdminDocumentos,
    aoAdminColaboradores,
    aoAdminFaq,
    aoAdminRelatorios,
    aoAdminFaleComRh,

    aoSair,
}: Props) {
    return (
        <header className="barraTopo">
            <div className="barraTopo__conteudo">
                <button
                    className="barraTopo__marca"
                    aria-label="Ir para página inicial"
                    type="button"
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
                    {!estaLogado ? (
                        <button className="barraTopo__botaoEntrar" onClick={aoClicarEntrar} type="button">
                            Entrar
                        </button>
                    ) : role === "ADMIN" ? (
                        <MenuAdmin
                            aoCriarComunicado={aoAdminCriarComunicado || (() => { })}
                            aoDocumentos={aoAdminDocumentos || (() => { })}
                            aoColaboradores={aoAdminColaboradores || (() => { })}
                            aoFaq={aoAdminFaq || (() => { })}
                            aoRelatorios={aoAdminRelatorios || (() => { })}
                            aoFaleComRh={aoAdminFaleComRh || (() => { })}
                            aoSair={aoSair}
                        />
                    ) : (
                        <>
                            <NotificacoesRhBell />
                            <MenuUsuario
                                aoMeuPerfil={aoMeuPerfil || (() => { })}
                                aoVerDocumentos={aoVerDocumentos || (() => { })}
                                aoFaq={aoFaq || (() => { })}
                                aoFaleComRh={aoFaleComRh || (() => { })}
                                aoSair={aoSair}
                            />
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
