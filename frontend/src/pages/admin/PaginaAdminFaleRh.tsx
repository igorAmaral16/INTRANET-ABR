import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    type RhStatus,
} from "../../api/faleRh.api";

import { connectSocket, disconnectSocket, getSocket } from "../../realtime/socketClient";

import "./paginaAdminFaleRh.css";

type EstadoTela = "carregando" | "erro" | "pronto";

// Ajuste fino de performance/UX
const MSG_RENDER_INITIAL = 70;
const MSG_RENDER_STEP = 50;

// Mesmo breakpoint do seu CSS
const MOBILE_MAX_W = 980;

type RealtimeMessage = {
    id: string | number;
    conteudo: string;
    created_at?: string | null;
    sender_role: "ADMIN" | "COLAB";
};

type RealtimeMessagePayload = {
    conversationId?: string | number;
    message?: RealtimeMessage;
};

type RealtimeConvUpdatePayload = {
    conversationId?: string | number;
    patch?: Partial<RhConversationListItem> & Record<string, unknown>;
};

function isAbortError(e: unknown): boolean {
    const err = e as any;
    return err?.name === "AbortError" || String(err?.message || "").toLowerCase().includes("abort");
}

function formatDateShort(d?: string | null) {
    if (!d) return "";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d).slice(0, 19).replace("T", " ");
    return date.toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function PaginaAdminFaleRh() {
    const navigate = useNavigate();
    const { sessao, estaLogadoAdmin, sair } = useSessaoAuth();

    const [estado, setEstado] = useState<EstadoTela>("carregando");
    const [erro, setErro] = useState<string | null>(null);

    const [status, setStatus] = useState<RhStatus>("PENDENTE");
    const [conversas, setConversas] = useState<RhConversationListItem[]>([]);

    const [conversaId, setConversaId] = useState<string | null>(null);
    const [detalhe, setDetalhe] = useState<RhConversationDetail | null>(null);
    const [msg, setMsg] = useState<string>("");

    const acListaRef = useRef<AbortController | null>(null);
    const acDetalheRef = useRef<AbortController | null>(null);

    const joinedConversationRef = useRef<string | null>(null);

    // Windowing + scroll
    const msgsRef = useRef<HTMLDivElement | null>(null);
    const [renderLimit, setRenderLimit] = useState<number>(MSG_RENDER_INITIAL);
    const pendingKeepScrollRef = useRef<{ prevHeight: number } | null>(null);

    // Mobile navigation (list -> chat)
    const [isMobile, setIsMobile] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        return window.innerWidth <= MOBILE_MAX_W;
    });
    const [mobileView, setMobileView] = useState<"list" | "chat">("list");

    useEffect(() => {
        const onResize = () => {
            const mobile = window.innerWidth <= MOBILE_MAX_W;
            setIsMobile(mobile);
            if (!mobile) setMobileView("list");
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        if (!estaLogadoAdmin || !sessao?.token) {
            navigate("/", { replace: true });
            return;
        }
    }, [estaLogadoAdmin, sessao?.token, navigate]);

    useEffect(() => {
        if (!sessao?.token) return;
        connectSocket(sessao.token);
        // disconnect on unmount handled elsewhere or by logout
    }, [sessao?.token]);

    const carregarLista = useCallback(
        async (signal?: AbortSignal) => {
            if (!sessao?.token) return;

            setEstado("carregando");
            setErro(null);

            try {
                const data = await adminListarConversas({ token: sessao.token, status }, signal);
                const items = Array.isArray((data as any)?.items) ? ((data as any).items as RhConversationListItem[]) : [];
                // ordena por última atualização (mais recente primeiro)
                items.sort((a, b) => {
                    const aTime = String(a.last_message_at || a.created_at || "");
                    const bTime = String(b.last_message_at || b.created_at || "");
                    return bTime.localeCompare(aTime);
                });
                setConversas(items);
                setEstado("pronto");
            } catch (e: unknown) {
                if (isAbortError(e)) return;
                const msgErr = e instanceof ErroHttp ? e.message : (e as any)?.message;
                setErro(msgErr || "Não foi possível carregar as conversas.");
                setEstado("erro");
            }
        },
        [sessao?.token, status]
    );

    useEffect(() => {
        acListaRef.current?.abort();
        const ac = new AbortController();
        acListaRef.current = ac;

        carregarLista(ac.signal);
        return () => ac.abort();
    }, [carregarLista]);

    const joinConversationRoom = useCallback((conversationId: string) => {
        const s = getSocket();
        if (!s) return;

        const prev = joinedConversationRef.current;
        if (prev && prev !== conversationId) {
            s.emit("rh:leave", prev);
        }

        s.emit("rh:join", conversationId);
        joinedConversationRef.current = conversationId;
    }, []);

    const scrollToBottom = useCallback(() => {
        const el = msgsRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, []);

    const isNearBottom = useCallback(() => {
        const el = msgsRef.current;
        if (!el) return false;
        const threshold = 160;
        return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    }, []);

    const abrirConversa = useCallback(
        async (id: string) => {
            if (!sessao?.token) return;

            acDetalheRef.current?.abort();
            const ac = new AbortController();
            acDetalheRef.current = ac;

            setConversaId(id);
            setDetalhe(null);
            setRenderLimit(MSG_RENDER_INITIAL);

            joinConversationRoom(id);

            if (isMobile) setMobileView("chat");

            try {
                const data = await adminObterConversa({ token: sessao.token, id }, ac.signal);
                setDetalhe(data);
                setTimeout(() => scrollToBottom(), 0);
            } catch (e: unknown) {
                if (isAbortError(e)) return;
                const msgErr = e instanceof ErroHttp ? e.message : (e as any)?.message;
                alert(msgErr || "Não foi possível abrir a conversa.");
                setConversaId(null);
                if (isMobile) setMobileView("list");
            }
        },
        [sessao?.token, joinConversationRoom, isMobile, scrollToBottom]
    );

    // Realtime listeners
    useEffect(() => {
        const s = getSocket();
        if (!s) return;

        const onMessage = (payload: RealtimeMessagePayload) => {
            const cid = String(payload?.conversationId ?? "");
            if (!cid) return;
            if (cid !== conversaId) return;

            const message = payload?.message;
            if (!message?.id) return;

            const stick = isNearBottom();

            setDetalhe((prev) => {
                if (!prev) return prev;
                const exists = (prev.messages || []).some((m: any) => String(m.id) === String(message.id));
                if (exists) return prev;
                return { ...prev, messages: [...(prev.messages || []), message as any] };
            });

            if (stick) setTimeout(() => scrollToBottom(), 0);
        };

        const onConvUpdate = (payload: RealtimeConvUpdatePayload) => {
            const cid = String(payload?.conversationId ?? "");
            if (!cid) return;

            const patch = (payload?.patch || {}) as any;

            setConversas((prev) => prev.map((c) => (String(c.id) === cid ? ({ ...c, ...patch } as any) : c)));

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
    }, [conversaId, isNearBottom, scrollToBottom]);

    const conversaAtual = detalhe?.conversation;
    const podeResponder = Boolean(conversaAtual && conversaAtual.status === "ABERTA");

    const rotuloColaborador = useMemo(() => {
        const m = (detalhe as any)?.conversation?.colaborador_matricula;
        const n = (detalhe as any)?.conversation?.colaborador_nome;
        const categoria = String((detalhe as any)?.conversation?.categoria || "");

        const nome = n || "Colaborador";
        const matricula = m ? String(m) : "—";
        const cat = categoria || "—";

        return { nome, matricula, categoria: cat };
    }, [detalhe]);

    // Admin: título deve ter Nome + Categoria + Matrícula
    const tituloHeader = useMemo(() => {
        return `${rotuloColaborador.nome} • ${rotuloColaborador.categoria} • ${rotuloColaborador.matricula}`;
    }, [rotuloColaborador]);

    const subtituloHeader = useMemo(() => {
        const assunto = String((detalhe as any)?.conversation?.assunto || "(Sem assunto)");
        const st = String((detalhe as any)?.conversation?.status || "");
        return `${assunto} • ${st}`;
    }, [detalhe]);

    async function aceitar(): Promise<void> {
        if (!sessao?.token || !conversaId) return;
        const ok = window.confirm("Aceitar esta conversa e iniciar o atendimento?");
        if (!ok) return;

        try {
            await adminAceitarConversa({ token: sessao.token, id: conversaId });

            const data = await adminObterConversa({ token: sessao.token, id: conversaId });
            setDetalhe(data);

            await carregarLista();
        } catch (e: unknown) {
            const msgErr = e instanceof ErroHttp ? e.message : (e as any)?.message;
            alert(msgErr || "Não foi possível aceitar a conversa.");
        }
    }

    async function enviar(): Promise<void> {
        if (!sessao?.token || !conversaId) return;
        const texto = msg.trim();
        if (!texto) return;

        setMsg("");
        try {
            await adminEnviarMensagem({ token: sessao.token, id: conversaId, body: { conteudo: texto } });

            // fallback (mantém seu comportamento atual)
            const data = await adminObterConversa({ token: sessao.token, id: conversaId });
            setDetalhe(data);

            await carregarLista();
            setTimeout(() => scrollToBottom(), 0);
        } catch (e: unknown) {
            const msgErr = e instanceof ErroHttp ? e.message : (e as any)?.message;
            alert(msgErr || "Não foi possível enviar a mensagem.");
            setMsg(texto);
        }
    }

    async function fechar(): Promise<void> {
        if (!sessao?.token || !conversaId) return;
        const ok = window.confirm("Encerrar esta conversa? Isso finaliza o atendimento.");
        if (!ok) return;

        try {
            await adminFecharConversa({ token: sessao.token, id: conversaId });

            const data = await adminObterConversa({ token: sessao.token, id: conversaId });
            setDetalhe(data);

            await carregarLista();
        } catch (e: unknown) {
            const msgErr = e instanceof ErroHttp ? e.message : (e as any)?.message;
            alert(msgErr || "Não foi possível fechar a conversa.");
        }
    }

    // Windowing
    const allMessages = (detalhe?.messages || []) as any[];
    const hasMoreToRender = allMessages.length > renderLimit;

    const visibleMessages = useMemo(() => {
        if (!allMessages.length) return [];
        if (allMessages.length <= renderLimit) return allMessages;
        return allMessages.slice(allMessages.length - renderLimit);
    }, [allMessages, renderLimit]);

    const onScrollMsgs = useCallback(() => {
        const el = msgsRef.current;
        if (!el) return;
        if (!hasMoreToRender) return;

        if (el.scrollTop <= 0) {
            pendingKeepScrollRef.current = { prevHeight: el.scrollHeight };
            setRenderLimit((v) => Math.min(allMessages.length, v + MSG_RENDER_STEP));
        }
    }, [hasMoreToRender, allMessages.length]);

    useEffect(() => {
        const keep = pendingKeepScrollRef.current;
        const el = msgsRef.current;
        if (!keep || !el) return;

        const newHeight = el.scrollHeight;
        const delta = newHeight - keep.prevHeight;
        el.scrollTop = delta;
        pendingKeepScrollRef.current = null;
    }, [renderLimit]);

    const tituloLateral = useMemo(() => {
        if (status === "PENDENTE") return "Pendentes";
        if (status === "ABERTA") return "Abertas";
        return "Fechadas";
    }, [status]);

    const handleLogout = () => {
        // Desconectar socket e sair
        disconnectSocket();
        sair();
        navigate("/", { replace: true });
    };

    // keyboard shortcuts: Enter envia; Shift+Enter nova linha
    const onComposerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            enviar();
        }
    };

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
                aoSair={handleLogout}
            />

            <main className="paginaBase__conteudo">
                <div className="paginaBase__topoInterno">
                    <button className="botaoVoltar" type="button" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} /> Voltar
                    </button>
                    <h1 className="paginaBase__titulo">Admin — Fale com o RH</h1>
                </div>

                {erro ? (
                    <div className="rhAdm__alert card cardErro" role="alert">
                        <ShieldAlert size={18} />
                        <div>{erro}</div>
                    </div>
                ) : null}

                <section className="rhAdm__layout">
                    {isMobile ? (mobileView === "list" ? (
                        // Lista mobile
                        <aside className="card rhAdm__lista">
                            <div className="rhAdm__listaTopo">
                                <div className="rhAdm__listaTitulo"><Inbox size={18} /> Inbox — {tituloLateral}</div>
                                <select
                                    value={status}
                                    onChange={(e) => {
                                        setStatus(e.target.value as RhStatus);
                                        setConversaId(null);
                                        setDetalhe(null);
                                        setMobileView("list");
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
                                            key={String(c.id)}
                                            type="button"
                                            className={`rhAdm__item ${String(c.id) === String(conversaId) ? "ativo" : ""}`}
                                            onClick={() => abrirConversa(String(c.id))}
                                        >
                                            <div className="rhAdm__itemTopo">
                                                <div className="rhAdm__badge">{String((c as any).categoria)}</div>
                                                <div className={`rhAdm__status ${String((c as any).status).toLowerCase()}`}>{(c as any).status}</div>
                                            </div>
                                            <div className="rhAdm__assunto">{(c as any).assunto || "(Sem assunto)"}</div>
                                            <div className="rhAdm__meta">
                                                {(c as any).colaborador_matricula ? `Matrícula: ${(c as any).colaborador_matricula}` : "Colaborador"}
                                                {(c as any).colaborador_nome ? ` • ${(c as any).colaborador_nome}` : ""}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </aside>
                    ) : (
                        // Chat mobile (quando aberto)
                        <section className="card rhAdm__chat">
                            <div className="rhAdm__chatMobileTopo">
                                <button type="button" className="rhAdm__chatMobileVoltar" onClick={() => setMobileView("list")}>
                                    <ArrowLeft size={18} /> Voltar
                                </button>
                                <div className="rhAdm__chatMobileTitulo">{tituloHeader}</div>
                                <div className="rhAdm__chatMobileSpacer" />
                            </div>

                            {!conversaId ? (
                                <div className="rhAdm__chatVazio">Selecione uma conversa ao lado.</div>
                            ) : !detalhe ? (
                                <div className="rhAdm__chatVazio">Carregando conversa...</div>
                            ) : (
                                <>
                                    {!isMobile ? null : (
                                        <div className="rhAdm__chatHeader">
                                            <div>
                                                <div className="rhAdm__chatTitulo">{tituloHeader}</div>
                                                <div className="rhAdm__chatSub">{subtituloHeader}</div>
                                            </div>
                                            <div className="rhAdm__acoes">
                                                {(detalhe as any)?.conversation?.status === "PENDENTE" ? (
                                                    <button type="button" className="rhAdm__btnAceitar" onClick={aceitar}>
                                                        <CheckCircle2 size={16} /> Aceitar
                                                    </button>
                                                ) : null}

                                                {(detalhe as any)?.conversation?.status !== "FECHADA" ? (
                                                    <button type="button" className="rhAdm__btnFechar" onClick={fechar}>
                                                        <XCircle size={16} /> Encerrar
                                                    </button>
                                                ) : (
                                                    <div className="rhAdm__fechadaTag">Encerrada</div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="rhAdm__msgs" ref={msgsRef} onScroll={onScrollMsgs}>
                                        {hasMoreToRender ? <div className="rhAdm__loadMoreHint">Role para cima para ver mensagens anteriores</div> : null}

                                        {visibleMessages.length === 0 ? (
                                            <div className="rhAdm__chatVazio" style={{ minHeight: 120 }}>
                                                Nenhuma mensagem ainda.
                                            </div>
                                        ) : (
                                            visibleMessages.map((m: any) => (
                                                <div key={String(m.id)} className={`rhAdm__msg ${m.sender_role === "ADMIN" ? "eu" : "colab"}`}>
                                                    <div className="rhAdm__msgAvatar"><div className="rhAdm__avatarCircle">{m.sender_role === "ADMIN" ? "RH" : "C"}</div></div>
                                                    <div className="rhAdm__msgBolha">
                                                        <div className="rhAdm__msgTexto">{m.conteudo}</div>
                                                        <div className="rhAdm__msgMeta">
                                                            {m.sender_role === "ADMIN" ? "RH" : rotuloColaborador.nome} • {formatDateShort(m.created_at)}
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
                                                    : (detalhe as any).conversation?.status === "PENDENTE"
                                                        ? "Aceite a conversa para responder."
                                                        : "Conversa encerrada"
                                            }
                                            disabled={!podeResponder}
                                            onKeyDown={onComposerKeyDown}
                                        />
                                        <button type="button" onClick={enviar} disabled={!podeResponder || !msg.trim()}>
                                            <Send size={16} /> Enviar
                                        </button>
                                    </div>
                                </>
                            )}
                        </section>
                    )) : (
                        // Desktop: lista + chat lado a lado
                        <>
                            {/* Lateral */}
                            <aside className="card rhAdm__lista">
                                <div className="rhAdm__listaTopo">
                                    <div className="rhAdm__listaTitulo"><Inbox size={18} /> Inbox — {tituloLateral}</div>

                                    <select
                                        value={status}
                                        onChange={(e) => {
                                            setStatus(e.target.value as RhStatus);
                                            setConversaId(null);
                                            setDetalhe(null);
                                            setMobileView("list");
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
                                                key={String(c.id)}
                                                type="button"
                                                className={`rhAdm__item ${String(c.id) === String(conversaId) ? "ativo" : ""}`}
                                                onClick={() => abrirConversa(String(c.id))}
                                            >
                                                <div className="rhAdm__itemTopo">
                                                    <div className="rhAdm__badge">{String((c as any).categoria)}</div>
                                                    <div className={`rhAdm__status ${String((c as any).status).toLowerCase()}`}>{(c as any).status}</div>
                                                </div>
                                                <div className="rhAdm__assunto">{(c as any).assunto || "(Sem assunto)"}</div>
                                                <div className="rhAdm__meta">
                                                    {(c as any).colaborador_matricula ? `Matrícula: ${(c as any).colaborador_matricula}` : "Colaborador"}
                                                    {(c as any).colaborador_nome ? ` • ${(c as any).colaborador_nome}` : ""}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </aside>

                            {/* Chat */}
                            <section className="card rhAdm__chat">
                                {!conversaId ? (
                                    <div className="rhAdm__chatVazio">Selecione uma conversa ao lado.</div>
                                ) : !detalhe ? (
                                    <div className="rhAdm__chatVazio">Carregando conversa...</div>
                                ) : (
                                    <>
                                        <div className="rhAdm__chatHeader">
                                            <div>
                                                <div className="rhAdm__chatTitulo">{tituloHeader}</div>
                                                <div className="rhAdm__chatSub">{subtituloHeader}</div>
                                            </div>

                                            <div className="rhAdm__acoes">
                                                {(detalhe as any)?.conversation?.status === "PENDENTE" ? (
                                                    <button type="button" className="rhAdm__btnAceitar" onClick={aceitar}>
                                                        <CheckCircle2 size={16} /> Aceitar
                                                    </button>
                                                ) : null}

                                                {(detalhe as any)?.conversation?.status !== "FECHADA" ? (
                                                    <button type="button" className="rhAdm__btnFechar" onClick={fechar}>
                                                        <XCircle size={16} /> Encerrar
                                                    </button>
                                                ) : (
                                                    <div className="rhAdm__fechadaTag">Encerrada</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rhAdm__msgs" ref={msgsRef} onScroll={onScrollMsgs}>
                                            {hasMoreToRender ? <div className="rhAdm__loadMoreHint">Role para cima para ver mensagens anteriores</div> : null}

                                            {visibleMessages.length === 0 ? (
                                                <div className="rhAdm__chatVazio" style={{ minHeight: 120 }}>
                                                    Nenhuma mensagem ainda.
                                                </div>
                                            ) : (
                                                visibleMessages.map((m: any) => (
                                                    <div key={String(m.id)} className={`rhAdm__msg ${m.sender_role === "ADMIN" ? "eu" : "colab"}`}>
                                                        <div className="rhAdm__msgAvatar"><div className="rhAdm__avatarCircle">{m.sender_role === "ADMIN" ? "RH" : "C"}</div></div>
                                                        <div className="rhAdm__msgBolha">
                                                            <div className="rhAdm__msgTexto">{m.conteudo}</div>
                                                            <div className="rhAdm__msgMeta">
                                                                {m.sender_role === "ADMIN" ? "RH" : rotuloColaborador.nome} • {formatDateShort(m.created_at)}
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
                                                        : (detalhe as any).conversation?.status === "PENDENTE"
                                                            ? "Aceite a conversa para responder."
                                                            : "Conversa encerrada"
                                                }
                                                disabled={!podeResponder}
                                                onKeyDown={onComposerKeyDown}
                                            />
                                            <button type="button" onClick={enviar} disabled={!podeResponder || !msg.trim()}>
                                                <Send size={16} />
                                                Enviar
                                            </button>
                                        </div>
                                    </>
                                )}
                            </section>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
