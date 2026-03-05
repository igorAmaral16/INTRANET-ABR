import "./BarraTopo.css";
import { MenuPublic } from "../MenuPublic/MenuPublic";
import { MenuAdmin } from "../MenuAdmin/MenuAdmin";
import logo from "../../assets/logo.webp";
import { NotificacoesRhBell } from "../NotificacoesRhBell/NotificacoesRhBell"; // NOVO
import { useNavigate } from "react-router-dom";

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
    aoMeusDocumentos?: () => void; // added
    aoCalendario?: () => void;
    aoFaq?: () => void;
    aoFaleComRh?: () => void;

    // ADMIN
    aoAdminCriarComunicado?: () => void;
    aoAdminDocumentos?: () => void;
    aoAdminColaboradores?: () => void;
    aoAdminFaq?: () => void;
    aoAdminRelatorios?: () => void;
    aoAdminFaleComRh?: () => void;
    aoAdminCalendario?: () => void;

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
    aoMeusDocumentos,
    aoFaq,
    aoFaleComRh,

    aoAdminCriarComunicado,
    aoAdminDocumentos,
    aoAdminColaboradores,
    aoAdminFaq,
    aoAdminRelatorios,
    aoAdminFaleComRh,
    aoAdminCalendario,

    aoCalendario,
    aoSair,
}: Props) {
    const navigate = useNavigate();

    // default handlers for common actions, so admin pages don't need to pass them
    const handleMeuPerfil = aoMeuPerfil || (() => navigate("/meu-perfil"));
    const handleVerDocs = aoVerDocumentos || (() => navigate("/documentos"));
    const handleMeusDocs = aoMeusDocumentos || (() => navigate("/meus-documentos"));
    const handleCalendario = aoCalendario || (() => navigate("/calendario"));
    const handleFaq = aoFaq || (() => navigate("/faq"));
    const handleFale = aoFaleComRh || (() => navigate("/fale-com-rh"));

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
                    <NotificacoesRhBell />
                    {estaLogado && role === "ADMIN" ? (
                        <MenuAdmin
                            aoCriarComunicado={aoAdminCriarComunicado}
                            aoDocumentos={aoAdminDocumentos}
                            aoColaboradores={aoAdminColaboradores}
                            aoFaq={aoAdminFaq}
                            aoRelatorios={aoAdminRelatorios}
                            aoFaleComRh={aoAdminFaleComRh}
                            aoCalendario={aoAdminCalendario}
                            aoSair={aoSair}
                        />
                    ) : (
                        <MenuPublic
                            estaLogado={estaLogado}
                            role={role || null}
                            aoClicarEntrar={aoClicarEntrar}
                            aoMeuPerfil={handleMeuPerfil}
                            aoVerDocumentos={handleVerDocs}
                            aoMeusDocumentos={handleMeusDocs}
                            aoCalendario={handleCalendario}
                            aoFaq={handleFaq}
                            aoFaleComRh={handleFale}
                            aoSair={aoSair}
                        />
                    )}
                </div>
            </div>
        </header>
    );
}
