import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Video as IconVideo,
} from "lucide-react";
import { BarraTopo } from "../../components/BarraTopo/BarraTopo";
import "./PaginaAdminTutoriais.css";
import { setores } from "../../utils/setores";
import { useSessaoAuth } from "../../hooks/useSessaoAuth";

export function PaginaAdminTutoriais() {
    const navigate = useNavigate();
    const { sessao, sair } = useSessaoAuth();

    return (
        <div className="paginaBase paginaAdminTutoriais">
            <BarraTopo
                busca=""
                aoMudarBusca={() => { }}
                mostrarBusca={false}
                aoIrParaInicio={() => navigate("/admin")}
                estaLogado={Boolean(sessao?.token)}
                role={sessao?.role}
                aoClicarEntrar={() => navigate("/")}

                aoAdminCriarComunicado={() => navigate("/admin/criar-comunicado")}
                aoAdminDocumentos={() => navigate("/admin/documentos")}
                aoAdminColaboradores={() => navigate("/admin/colaboradores")}
                aoAdminFaq={() => navigate("/admin/faq")}
                aoAdminRelatorios={() => navigate("/admin/relatorios")}

                aoSair={() => {
                    sair();
                    navigate("/", { replace: true });
                }}
            />

            <main className="paginaBase__conteudo">
                <div className="paginaBase__topoInterno">
                    <button className="botaoVoltar" type="button" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} /> Voltar
                    </button>

                    <div className="admDocs__header">
                        <h1 className="paginaBase__titulo">
                            Admin <IconVideo size={20} /> Tutoriais
                        </h1>
                        <div className="admDocs__subtitulo">
                            Selecione o setor para gerenciar vídeos.
                        </div>
                    </div>
                </div>

                <ul className="setores-lista">
                    {setores.map((s) => (
                        <li key={s}>
                            <button
                                type="button"
                                onClick={() => navigate(`/admin/tutoriais/${s}`)}
                            >
                                {s}
                            </button>
                        </li>
                    ))}
                </ul>
            </main>
        </div>
    );
}
