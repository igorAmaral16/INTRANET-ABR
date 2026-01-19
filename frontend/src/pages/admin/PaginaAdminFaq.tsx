import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BarraTopo } from "../../components/BarraTopo/BarraTopo";
import { useSessaoAuth } from "../../hooks/useSessaoAuth";
import "../PaginaBase.css";

export function PaginaAdminFaq() {
    const navigate = useNavigate();
    const { sessao, estaLogadoAdmin, sair } = useSessaoAuth();

    const estaLogado = Boolean(sessao?.token);
    const role = sessao?.role;

    const bloqueado = useMemo(() => !estaLogadoAdmin || role !== "ADMIN", [estaLogadoAdmin, role]);

    if (bloqueado) {
        return (
            <div className="paginaBase">
                <BarraTopo
                    busca=""
                    aoMudarBusca={() => { }}
                    mostrarBusca={false}
                    aoIrParaInicio={() => navigate("/")}
                    estaLogado={estaLogado}
                    role={role}
                    aoClicarEntrar={() => navigate("/")}
                    aoSair={sair}
                />
                <main className="paginaBase__conteudo">
                    <div className="card cardErro">Acesso restrito. Faça login como ADMIN.</div>
                </main>
            </div>
        );
    }

    return (
        <div className="paginaBase">
            <BarraTopo
                busca=""
                aoMudarBusca={() => { }}
                mostrarBusca={false}
                aoIrParaInicio={() => navigate("/admin")}
                estaLogado={estaLogado}
                role={role}
                aoClicarEntrar={() => navigate("/")}
                aoAdminCriarComunicado={() => navigate("/admin/criar-comunicado")}
                aoAdminDocumentos={() => navigate("/admin/documentos")}
                aoAdminColaboradores={() => navigate("/admin/colaboradores")}
                aoAdminFaq={() => navigate("/admin/faq")}
                aoAdminRelatorios={() => navigate("/admin/relatorios")}
                aoSair={sair}
            />
            <main className="paginaBase__conteudo">
                <h1 className="paginaBase__titulo">FAQ (Admin)</h1>
                <div className="card">
                    Mesma UX de Colaboradores (lista + pesquisa + filtros + criar/editar/excluir). Próxima etapa.
                </div>
            </main>
        </div>
    );
}
