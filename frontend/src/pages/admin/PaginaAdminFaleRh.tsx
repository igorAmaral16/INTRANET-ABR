import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Inbox, Send, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";

import { BarraTopo } from "../../components/BarraTopo/BarraTopo";
import { useSessaoAuth } from "../../hooks/useSessaoAuth";
import { ErroHttp } from "../../api/clienteHttp";
import {
    adminListarConversas,
    adminObterConversa,
    adminAceitarConversa,
    adminEnviarMensagem,
    adminFecharConversa,
    type RhConversationListItem,
    type RhConversationDetail,
    type RhStatus
} from "../../api/faleRh.api";

import { connectSocket, disconnectSocket, getSocket } from "../../realtime/socketClient";

import "./paginaAdminFaleRh.css";

function isAbortError(e: any) {
    return e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("abort");
}

export function PaginaAdminFaleRh() {
    const navigate = useNavigate();
    const { sessao, estaLogadoAdmin, sair } = useSessaoAuth();

    const [estado, setEstado] = useState<"carregando" | "erro" | "pronto">("carregando");
    const [erro, setErro] = useState<string | null>(null);

    const [status, setStatus] = useState<RhStatus>("PENDENTE");
    const [conversas, setConversas] = useState<RhConversationListItem[]>([]);

    const [conversaId, setConversaId] = useState<string | null>(null);
    const [detalhe, setDetalhe] = useState<RhConversationDetail | null>(null);
    const [msg, setMsg] = useState("");

    const acListaRef = useRef<AbortController | null>(null);
    const acDetalheRef = useRef<AbortController | null>(null);

    const joinedConversationRef = useRef<string | null>(null);

    useEffect(() => {
        if (!estaLogadoAdmin || !sessao?.token) {
            navigate("/", { replace: true });
            return;
        }
    }, [estaLogadoAdmin, sessao?.token, navigate]);

    // GARANTE socket conectado (essencial para realtime)
    useEffect(() => {
        if (!sessao?.token) return;
        connectSocket(sessao.token);
    }, [sessao?.token]);

    async function carregarLista(signal?: AbortSignal) {
        if (!sessao?.token) return;

        setEstado("carregando");
        setErro(null);

        try {
            const data = await adminListarConversas({ token: sessao.token, status }, signal);
            const items = Array.isArray(data?.items) ? data.items : [];
            items.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
            setConversas(items);
            setEstado("pronto");
        } catch (e: any) {
            if (isAbortError(e)) return;
            const msgErr = e instanceof ErroHttp ? e.message : e?.message;
            setErro(msgErr || "Não foi possível carregar as conversas.");
            setEstado("erro");
        }
    }

    useEffect(() => {
        acListaRef.current?.abort();
        const ac = new AbortController();
        acListaRef.current = ac;

        carregarLista(ac.signal);
        return () => ac.abort();
    }, [sessao?.token, status]);

    function joinConversationRoom(conversationId: string) {
        const s = getSocket();
        if (!s) return;

        const prev = joinedConversationRef.current;
        if (prev && prev !== conversationId) {
            s.emit("rh:leave", prev);
        }

        s.emit("rh:join", conversationId);
        joinedConversationRef.current = conversationId;
    }

    async function abrirConversa(id: string) {
        if (!sessao?.token) return;

        acDetalheRef.current?.abort();
        const ac = new AbortController();
        acDetalheRef.current = ac;

        setConversaId(id);
        setDetalhe(null);

        joinConversationRoom(id);

        try {
            const data = await adminObterConversa({ token: sessao.token, id }, ac.signal);
            setDetalhe(data);
        } catch (e: any) {
            if (isAbortError(e)) return;
            const msgErr = e instanceof ErroHttp ? e.message : e?.message;
            alert(msgErr || "Não foi possível abrir a conversa.");
            setConversaId(null);
        }
    }

    // Listeners realtime
    useEffect(() => {
        const s = getSocket();
        if (!s) return;

        const onMessage = (payload: any) => {
            const cid = String(payload?.conversationId ?? "");
            if (!cid) return;
            if (cid !== conversaId) return;

            const message = payload?.message;
            if (!message?.id) return;

            setDetalhe((prev) => {
                if (!prev) return prev;
                const exists = (prev.messages || []).some((m: any) => String(m.id) === String(message.id));
                if (exists) return prev;
                return { ...prev, messages: [...(prev.messages || []), message] };
            });
        };

        const onConvUpdate = (payload: any) => {
            const cid = String(payload?.conversationId ?? "");
            if (!cid) return;

            const patch = payload?.patch || {};

            setConversas((prev) =>
                prev.map((c) => (String(c.id) === cid ? ({ ...c, ...patch } as any) : c))
            );

            if (cid === conversaId) {
                setDetalhe((prev) => {
                    if (!prev) return prev;
                    return { ...prev, conversation: { ...(prev.conversation as any), ...patch } as any };
                });
            }
        };

        s.on("rh:message", onMessage);
        s.on("rh:conversation:update", onConvUpdate);

        return () => {
            s.off("rh:message", onMessage);
            s.off("rh:conversation:update", onConvUpdate);
        };
    }, [conversaId]);

    const conversaAtual = detalhe?.conversation;
    const podeResponder = Boolean(conversaAtual && conversaAtual.status === "ABERTA");

    async function aceitar() {
        if (!sessao?.token || !conversaId) return;
        const ok = window.confirm("Aceitar esta conversa e iniciar o atendimento?");
        if (!ok) return;

        try {
            await adminAceitarConversa({ token: sessao.token, id: conversaId });

            // fallback de consistência
            const data = await adminObterConversa({ token: sessao.token, id: conversaId });
            setDetalhe(data);

            await carregarLista();
        } catch (e: any) {
            const msgErr = e instanceof ErroHttp ? e.message : e?.message;
            alert(msgErr || "Não foi possível aceitar a conversa.");
        }
    }

    async function enviar() {
        if (!sessao?.token || !conversaId) return;
        const texto = msg.trim();
        if (!texto) return;

        setMsg("");
        try {
            await adminEnviarMensagem({ token: sessao.token, id: conversaId, body: { conteudo: texto } });

            // fallback (pode remover se quiser 100% realtime)
            const data = await adminObterConversa({ token: sessao.token, id: conversaId });
            setDetalhe(data);

            await carregarLista();
        } catch (e: any) {
            const msgErr = e instanceof ErroHttp ? e.message : e?.message;
            alert(msgErr || "Não foi possível enviar a mensagem.");
            setMsg(texto);
        }
    }

    async function fechar() {
        if (!sessao?.token || !conversaId) return;
        const ok = window.confirm("Encerrar esta conversa? Isso finaliza o atendimento.");
        if (!ok) return;

        try {
            await adminFecharConversa({ token: sessao.token, id: conversaId });

            const data = await adminObterConversa({ token: sessao.token, id: conversaId });
            setDetalhe(data);

            await carregarLista();
        } catch (e: any) {
            const msgErr = e instanceof ErroHttp ? e.message : e?.message;
            alert(msgErr || "Não foi possível fechar a conversa.");
        }
    }

    const tituloLateral = useMemo(() => {
        if (status === "PENDENTE") return "Pendentes";
        if (status === "ABERTA") return "Abertas";
        return "Fechadas";
    }, [status]);

    const rotuloColaborador = useMemo(() => {
        const m = detalhe?.conversation?.colaborador_matricula;
        const n = detalhe?.conversation?.colaborador_nome;
        if (m && n) return `${m} • ${n}`;
        if (m) return `Matrícula: ${m}`;
        if (n) return n;
        return "Colaborador";
    }, [detalhe?.conversation?.colaborador_matricula, detalhe?.conversation?.colaborador_nome]);

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
                aoAdminFaleComRh={() => navigate("/admin/fale-com-rh")}
                aoAdminRelatorios={() => navigate("/admin/relatorios")}

                aoSair={() => {
                    disconnectSocket();
                    sair();
                    navigate("/", { replace: true });
                }}
            />

            <main className="paginaBase__conteudo">
                <div className="paginaBase__topoInterno">
                    <button className="botaoVoltar" type="button" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} /> Voltar
                    </button>
                    <h1 className="paginaBase__titulo">Admin — Fale com o RH</h1>
                </div>

                {erro ? (
                    <div className="rhAdm__alert card cardErro">
                        <ShieldAlert size={18} />
                        <div>{erro}</div>
                    </div>
                ) : null}

                <section className="rhAdm__layout">
                    <aside className="card rhAdm__lista">
                        <div className="rhAdm__listaTopo">
                            <div className="rhAdm__listaTitulo">
                                <Inbox size={18} /> Inbox — {tituloLateral}
                            </div>

                            <select
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value as RhStatus);
                                    setConversaId(null);
                                    setDetalhe(null);
                                }}
                            >
                                <option value="PENDENTE">Pendentes</option>
                                <option value="ABERTA">Abertas</option>
                                <option value="FECHADA">Fechadas</option>
                            </select>
                        </div>

                        {estado === "carregando" ? <div className="rhAdm__placeholder">Carregando...</div> : null}
                        {estado === "erro" ? <div className="rhAdm__placeholder">Falha ao carregar.</div> : null}

                        {estado === "pronto" && conversas.length === 0 ? (
                            <div className="rhAdm__placeholder">Nenhuma conversa nesta fila.</div>
                        ) : null}

                        {estado === "pronto" && conversas.length > 0 ? (
                            <div className="rhAdm__listaItens">
                                {conversas.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        className={`rhAdm__item ${c.id === conversaId ? "ativo" : ""}`}
                                        onClick={() => abrirConversa(c.id)}
                                    >
                                        <div className="rhAdm__itemTopo">
                                            <div className="rhAdm__badge">{String(c.categoria)}</div>
                                            <div className={`rhAdm__status ${String(c.status).toLowerCase()}`}>{c.status}</div>
                                        </div>
                                        <div className="rhAdm__assunto">{c.assunto || "(Sem assunto)"}</div>
                                        <div className="rhAdm__meta">
                                            {c.colaborador_matricula ? `Matrícula: ${c.colaborador_matricula}` : "Colaborador"}
                                            {c.colaborador_nome ? ` • ${c.colaborador_nome}` : ""}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </aside>

                    <section className="card rhAdm__chat">
                        {!conversaId ? (
                            <div className="rhAdm__chatVazio">Selecione uma conversa ao lado.</div>
                        ) : !detalhe ? (
                            <div className="rhAdm__chatVazio">Carregando conversa...</div>
                        ) : (
                            <>
                                <div className="rhAdm__chatHeader">
                                    <div>
                                        <div className="rhAdm__chatTitulo">{detalhe.conversation.assunto || "(Sem assunto)"}</div>
                                        <div className="rhAdm__chatSub">
                                            {String(detalhe.conversation.categoria)} • <strong>{detalhe.conversation.status}</strong>
                                            {" • "}
                                            <span>{rotuloColaborador}</span>
                                        </div>
                                    </div>

                                    <div className="rhAdm__acoes">
                                        {detalhe.conversation.status === "PENDENTE" ? (
                                            <button type="button" className="rhAdm__btnAceitar" onClick={aceitar}>
                                                <CheckCircle2 size={16} /> Aceitar
                                            </button>
                                        ) : null}

                                        {detalhe.conversation.status !== "FECHADA" ? (
                                            <button type="button" className="rhAdm__btnFechar" onClick={fechar}>
                                                <XCircle size={16} /> Encerrar
                                            </button>
                                        ) : (
                                            <div className="rhAdm__fechadaTag">Encerrada</div>
                                        )}
                                    </div>
                                </div>

                                <div className="rhAdm__msgs">
                                    {(detalhe.messages || []).length === 0 ? (
                                        <div className="rhAdm__chatVazio" style={{ minHeight: 120 }}>
                                            Nenhuma mensagem ainda.
                                        </div>
                                    ) : (
                                        (detalhe.messages || []).map((m: any) => (
                                            <div key={m.id} className={`rhAdm__msg ${m.sender_role === "ADMIN" ? "eu" : "colab"}`}>
                                                <div className="rhAdm__msgBolha">
                                                    <div className="rhAdm__msgTexto">{m.conteudo}</div>
                                                    <div className="rhAdm__msgMeta">
                                                        {m.sender_role === "ADMIN" ? "RH" : rotuloColaborador} •{" "}
                                                        {String(m.created_at || "").slice(0, 19).replace("T", " ")}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="rhAdm__composer">
                                    <input
                                        value={msg}
                                        onChange={(e) => setMsg(e.target.value)}
                                        placeholder={
                                            podeResponder
                                                ? "Digite sua resposta..."
                                                : detalhe.conversation.status === "PENDENTE"
                                                    ? "Aceite a conversa para responder."
                                                    : "Conversa encerrada"
                                        }
                                        disabled={!podeResponder}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") enviar();
                                        }}
                                    />
                                    <button type="button" onClick={enviar} disabled={!podeResponder || !msg.trim()}>
                                        <Send size={16} />
                                        Enviar
                                    </button>
                                </div>
                            </>
                        )}
                    </section>
                </section>
            </main>
        </div>
    );
}
