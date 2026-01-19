import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BarraTopo } from "../../components/BarraTopo/BarraTopo";
import { useSessaoAuth } from "../../hooks/useSessaoAuth";
import { ErroHttp } from "../../api/clienteHttp";
import {
    criarComunicadoAdmin,
    atualizarComunicadoAdmin,
    obterComunicadoAdmin,
    type ComunicadoAdminPayload
} from "../../api/comunicados.api";

function isAbortError(e: any) {
    return e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("abort");
}

function hojeMaisDias(dias: number) {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

export function PaginaAdminCriarComunicado() {
    const navigate = useNavigate();
    const { id } = useParams();
    const comunicadoId = id ? Number(id) : null;

    const { sessao, estaLogadoAdmin, sair } = useSessaoAuth();

    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const [titulo, setTitulo] = useState("");
    const [descricao, setDescricao] = useState("");
    const [importancia, setImportancia] = useState<ComunicadoAdminPayload["importancia"]>("RELEVANTE");
    const [fixadoTopo, setFixadoTopo] = useState(false);
    const [expiraEm, setExpiraEm] = useState(hojeMaisDias(7));

    const acRef = useRef<AbortController | null>(null);

    const modo = comunicadoId ? "EDITAR" : "CRIAR";

    useEffect(() => {
        if (!estaLogadoAdmin || !sessao?.token) {
            navigate("/", { replace: true });
            return;
        }

        if (!comunicadoId) return;

        acRef.current?.abort();
        const ac = new AbortController();
        acRef.current = ac;

        (async () => {
            setCarregando(true);
            setErro(null);
            try {
                const data = await obterComunicadoAdmin({ token: sessao.token, id: comunicadoId }, ac.signal);
                setTitulo(String((data as any)?.titulo || ""));
                setDescricao(String((data as any)?.descricao || ""));
                setImportancia((data as any)?.importancia || "RELEVANTE");
                setFixadoTopo(Boolean((data as any)?.fixado_topo));
                setExpiraEm(String((data as any)?.expira_em || hojeMaisDias(7)));
            } catch (e: any) {
                if (isAbortError(e)) return;
                const msg = e instanceof ErroHttp ? e.message : e?.message;
                setErro(msg || "Não foi possível carregar o comunicado para edição.");
            } finally {
                setCarregando(false);
            }
        })();

        return () => ac.abort();
    }, [estaLogadoAdmin, sessao?.token, comunicadoId]);

    const payloadBase = useMemo((): Omit<ComunicadoAdminPayload, "status"> => {
        return {
            titulo: titulo.trim(),
            descricao: descricao.trim(),
            importancia,
            fixado_topo: fixadoTopo,
            expira_em: expiraEm.trim()
        };
    }, [titulo, descricao, importancia, fixadoTopo, expiraEm]);

    async function salvar(status: "RASCUNHO" | "PUBLICADO") {
        if (!sessao?.token) return;

        const body: ComunicadoAdminPayload = {
            ...payloadBase,
            status
        };

        if (!body.titulo || body.titulo.length < 3) {
            setErro("Informe um título válido (mínimo 3 caracteres).");
            return;
        }
        if (!body.descricao || body.descricao.length < 3) {
            setErro("Informe uma descrição válida (mínimo 3 caracteres).");
            return;
        }

        if (status === "PUBLICADO") {
            if (!body.expira_em || body.expira_em.length !== 10) {
                setErro("Para publicar, informe a data de expiração no formato dd/mm/aaaa.");
                return;
            }

            const ok = window.confirm("Confirmar publicação do comunicado?");
            if (!ok) return;
        }

        setCarregando(true);
        setErro(null);

        try {
            if (!comunicadoId) {
                await criarComunicadoAdmin({ token: sessao.token, body });
            } else {
                await atualizarComunicadoAdmin({ token: sessao.token, id: comunicadoId, body });
            }

            navigate("/admin", { replace: true });
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            setErro(msg || "Não foi possível salvar o comunicado.");
        } finally {
            setCarregando(false);
        }
    }

    return (
        <div className="paginaBase">
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
                    <h1 className="paginaBase__titulo">
                        {modo === "CRIAR" ? "Criar comunicado" : "Editar comunicado"}
                    </h1>
                </div>

                {erro ? <div className="card cardErro">{erro}</div> : null}

                <section className="card" style={{ display: "grid", gap: 12 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 900 }}>Título</span>
                        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do comunicado" />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 900 }}>Descrição</span>
                        <textarea
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            placeholder="Conteúdo do comunicado"
                            rows={8}
                            style={{ resize: "vertical" }}
                        />
                    </label>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <label style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontWeight: 900 }}>Importância</span>
                            <select value={importancia} onChange={(e) => setImportancia(e.target.value as any)}>
                                <option value="IMPORTANTE">IMPORTANTE</option>
                                <option value="RELEVANTE">RELEVANTE</option>
                                <option value="POUCO_RELEVANTE">POUCO_RELEVANTE</option>
                            </select>
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span style={{ fontWeight: 900 }}>Expira em (dd/mm/aaaa)</span>
                            <input value={expiraEm} onChange={(e) => setExpiraEm(e.target.value)} placeholder="dd/mm/aaaa" />
                        </label>
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input type="checkbox" checked={fixadoTopo} onChange={(e) => setFixadoTopo(e.target.checked)} />
                        <span style={{ fontWeight: 900 }}>Fixar no topo</span>
                    </label>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button type="button" disabled={carregando} onClick={() => salvar("PUBLICADO")}>
                            Publicar
                        </button>
                        <button type="button" disabled={carregando} onClick={() => salvar("RASCUNHO")}>
                            Salvar em rascunho
                        </button>
                        <button type="button" disabled={carregando} onClick={() => navigate("/admin", { replace: true })}>
                            Cancelar
                        </button>
                    </div>

                    {carregando ? <div style={{ opacity: 0.8 }}>Processando...</div> : null}
                </section>
            </main>
        </div>
    );
}
