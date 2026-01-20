import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, BadgeX, IdCard, CalendarDays } from "lucide-react";
import { BarraTopo } from "../components/BarraTopo/BarraTopo";
import { useSessaoAuth } from "../hooks/useSessaoAuth";
import { obterMeuPerfilColaborador, type PerfilColaborador } from "../api/colaborador.api";
import "./PaginaBase.css";
import "./PaginaMeuPerfil.css";

function formatarDataBR(valor: string) {
    if (!valor) return "-";

    // Se já vier no padrão dd/mm/aaaa, retorna como está
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return valor;

    // Tenta YYYY-MM-DD
    const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;

    // Tenta ISO / Date parseável
    const d = new Date(valor);
    if (!Number.isFinite(d.getTime())) return valor;

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function isAbortError(e: any) {
    return e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("aborted");
}

export function PaginaMeuPerfil() {
    const navigate = useNavigate();
    const { sessao, estaLogadoColab, sair } = useSessaoAuth();

    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [perfil, setPerfil] = useState<PerfilColaborador | null>(null);

    useEffect(() => {
        if (!estaLogadoColab || !sessao?.token) {
            setCarregando(false);
            setErro("Faça login como colaborador para visualizar seu perfil.");
            setPerfil(null);
            return;
        }

        const ac = new AbortController();

        (async () => {
            setCarregando(true);
            setErro(null);

            try {
                const data = await obterMeuPerfilColaborador(
                    { token: sessao.token, userId: sessao.user?.id },
                    ac.signal
                );
                setPerfil(data);
            } catch (e: any) {
                if (isAbortError(e)) return; // não exibe erro em abort
                setPerfil(null);
                setErro(e?.message || "Não foi possível carregar o perfil.");
            } finally {
                if (!ac.signal.aborted) setCarregando(false);
            }
        })();

        return () => ac.abort();
        // Observação: manter dependências simples evita reexecuções desnecessárias
    }, [estaLogadoColab, sessao?.token]);

    return (
        <div className="paginaBase">
            <BarraTopo
                busca=""
                aoMudarBusca={() => { }}
                mostrarBusca={false}
                aoIrParaInicio={() => navigate("/")}

                estaLogado={Boolean(sessao?.token && estaLogadoColab)}
                role={sessao?.role}

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
                    <h1 className="paginaBase__titulo">Meu Perfil</h1>
                </div>

                {carregando ? <div className="card">Carregando...</div> : null}
                {!carregando && erro ? <div className="card cardErro">{erro}</div> : null}

                {!carregando && !erro && perfil ? (
                    <section className="perfil">
                        <div className="perfil__linha">
                            <div className="perfil__campo">
                                <div className="perfil__rotulo"><IdCard size={16} /> Matrícula</div>
                                <div className="perfil__valor">{perfil.matricula}</div>
                            </div>

                            <div className="perfil__campo">
                                <div className="perfil__rotulo">
                                    {String(perfil.status).toUpperCase() === "ATIVO" ? <BadgeCheck size={16} /> : <BadgeX size={16} />}
                                    Status
                                </div>
                                <div className={`perfil__valor status ${String(perfil.status).toUpperCase() === "ATIVO" ? "ativo" : "inativo"}`}>
                                    {String(perfil.status).toUpperCase()}
                                </div>
                            </div>
                        </div>

                        <div className="perfil__campo">
                            <div className="perfil__rotulo">Nome Completo</div>
                            <div className="perfil__valor">{perfil.nome_completo}</div>
                        </div>

                        <div className="perfil__campo">
                            <div className="perfil__rotulo"><CalendarDays size={16} /> Data de nascimento</div>
                            <div className="perfil__valor">{formatarDataBR(perfil.data_nascimento)}</div>
                        </div>
                    </section>
                ) : null}
            </main>
        </div>
    );
}
