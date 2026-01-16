import { useNavigate } from "react-router-dom";
import { ArrowLeft, Construction } from "lucide-react";
import { BarraTopo } from "../components/BarraTopo/BarraTopo";
import { useSessaoAuth } from "../hooks/useSessaoAuth";
import "./PaginaBase.css";

export function PaginaEmConstrucao({ titulo }: { titulo: string }) {
    const navigate = useNavigate();
    const { estaLogadoColab, sair } = useSessaoAuth();

    return (
        <div className="paginaBase">
            <BarraTopo
                busca=""
                aoMudarBusca={() => { }}
                mostrarBusca={false}
                estaLogadoColab={estaLogadoColab}
                aoClicarEntrar={() => navigate("/")}
                aoMeuPerfil={() => navigate("/meu-perfil")}
                aoVerDocumentos={() => navigate("/documentos")}
                aoFaq={() => navigate("/faq")}
                aoFaleComRh={() => navigate("/fale-com-rh")}
                aoSair={sair}
            />

            <main className="paginaBase__conteudo">
                <div className="paginaBase__topoInterno">
                    <button className="botaoVoltar" type="button" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} /> Voltar
                    </button>
                    <h1 className="paginaBase__titulo">{titulo}</h1>
                </div>

                <div style={{
                    padding: 14,
                    borderRadius: 16,
                    border: "1px solid rgba(0,0,0,0.10)",
                    background: "rgba(255,255,255,0.96)",
                    display: "flex",
                    gap: 12,
                    alignItems: "center"
                }}>
                    <Construction size={20} />
                    Esta funcionalidade será desenvolvida na última etapa.
                </div>
            </main>
        </div>
    );
}
