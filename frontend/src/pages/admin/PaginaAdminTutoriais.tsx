import { useNavigate } from "react-router-dom";
import {
    Video as IconVideo,
} from "lucide-react";
import { SidebarAdmin } from "../../components/SidebarAdmin/SidebarAdmin";
import { BotaoVoltar } from "../../components/BotaoVoltar/BotaoVoltar";
import "./PaginaAdminTutoriais.css";
import { setores } from "../../utils/setores";
import { useSessaoAuth } from "../../hooks/useSessaoAuth";

export function PaginaAdminTutoriais() {
    const navigate = useNavigate();
    const { sessao, sair } = useSessaoAuth();

    return (
        <div className="paginaBase paginaAdminTutoriais">
            <SidebarAdmin
                estaLogado={Boolean(sessao?.token)}
                aoIrParaHome={() => navigate("/admin/home")}
                aoCriarComunicado={() => navigate("/admin/criar-comunicado")}
                aoDocumentos={() => navigate("/admin/documentos")}
                aoColaboradores={() => navigate("/admin/colaboradores")}
                aoCalendario={() => navigate("/admin/calendario")}
                aoFaq={() => navigate("/admin/faq")}
                aoFaleComRh={() => navigate("/admin/fale-com-rh")}
                aoRelatorios={() => navigate("/admin/relatorios")}
                aoCarrossel={() => navigate("/admin/carousel")}
                aoSair={() => {
                    sair();
                    navigate("/", { replace: true });
                }}
            />

            <main className="paginaBase__conteudo">
                <BotaoVoltar destino="/admin/home" />
                <div className="paginaBase__topoInterno">
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
