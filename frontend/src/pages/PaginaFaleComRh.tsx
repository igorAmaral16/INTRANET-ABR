import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Send, XCircle, Plus, ShieldAlert } from "lucide-react";

import { BarraTopo } from "../components/BarraTopo/BarraTopo";
import { Modal } from "../components/Modal/Modal";
import { useSessaoAuth } from "../hooks/useSessaoAuth";
import { ErroHttp } from "../api/clienteHttp";
import {
    colabCriarConversa,
    colabListarConversas,
    colabObterConversa,
    colabEnviarMensagem,
    colabFecharConversa,
    type RhCategoria,
    type RhConversationListItem,
    type RhConversationDetail
} from "../api/faleRh.api";

import { connectSocket, disconnectSocket, getSocket } from "../realtime/socketClient";
import { useNotificacoesRh } from "../contexts/NotificacoesRhContext";

import "./PaginaFaleComRh.css";
import "./PaginaBase.css";

function isAbortError(e: any) {
    return e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("abort");
}

const CATEGORIAS: { value: RhCategoria; label: string; sugestoes: string[] }[] = [
    { value: "BENEFICIOS", label: "Benefícios", sugestoes: ["Vale transporte", "Vale alimentação/refeição", "Plano de saúde", "Outros benefícios"] },
    { value: "FERIAS", label: "Férias", sugestoes: ["Agendamento", "Saldo de férias", "Dúvidas de regras", "Outros"] },
    { value: "PONTO", label: "Ponto", sugestoes: ["Ajuste/abono", "Esquecimento de marcação", "Escala", "Outros"] },
    { value: "DOCUMENTOS", label: "Documentos", sugestoes: ["Declarações", "Holerite", "Comprovantes", "Outros"] },
    { value: "PAGAMENTO", label: "Pagamento", sugestoes: ["Data de pagamento", "Diferença", "Adiantamento", "Outros"] },
    { value: "OUTROS", label: "Outros", sugestoes: ["Geral", "Dúvida diversa"] }
];

export function PaginaFaleComRh() {
    const navigate = useNavigate();
    const location = useLocation();
    const { sessao, estaLogadoColab, sair } = useSessaoAuth();
    const { removeConversation } = useNotificacoesRh();

    const [estado, setEstado] = useState<"carregando" | "erro" | "pronto">("carregando");
    const [erro, setErro] = useState<string | null>(null);

    const [conversas, setConversas] = useState<RhConversationListItem[]>([]);
    const [conversaAbertaId, setConversaAbertaId] = useState<string | null>(null);
    const [detalhe, setDetalhe] = useState<RhConversationDetail | null>(null);
    const [msg, setMsg] = useState("");

    const [modalNova, setModalNova] = useState(false);
    const [categoria, setCategoria] = useState<RhCategoria>("BENEFICIOS");
    const [assunto, setAssunto] = useState("");
    const [mensagemInicial, setMensagemInicial] = useState("");

    const acListaRef = useRef<AbortController | null>(null);
    const acDetalheRef = useRef<AbortController | null>(null);

    // Controle join/leave de rooms
    const joinedConversationRef = useRef<string | null>(null);

    useEffect(() => {
        if (!estaLogadoColab || !sessao?.token) {
            navigate("/", { replace: true });
            return;
        }
    }, [estaLogadoColab, sessao?.token, navigate]);

    // GARANTE socket conectado (essencial para realtime + notificações)
    useEffect(() => {
        if (!sessao?.token) return;
        connectSocket(sessao.token);
    }, [sessao?.token]);

    async function carregarLista(signal?: AbortSignal) {
        if (!sessao?.token) return;

        setEstado("carregando");
        setErro(null);

        try {
            const data = await colabListarConversas({ token: sessao.token }, signal);
            const items = Array.isArray(data?.items) ? data.items : [];
            items.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
            setConversas(items);
            setEstado("pronto");
        } catch (e: any) {
            if (isAbortError(e)) return;
            const msgErr = e instanceof ErroHttp ? e.message : e?.message;
            setErro(msgErr || "Não foi possível carregar suas conversas.");
            setEstado("erro");
        }
    }

    useEffect(() => {
        acListaRef.current?.abort();
        const ac = new AbortController();
        acListaRef.current = ac;

        carregarLista(ac.signal);
        return () => ac.abort();
    }, [sessao?.token]);

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

        setConversaAbertaId(id);
        setDetalhe(null);

        // remove notificações dessa conversa ao abrir
        removeConversation(id);

        // entra no room da conversa (tempo real)
        joinConversationRoom(id);

        try {
            const data = await colabObterConversa({ token: sessao.token, id }, ac.signal);
            setDetalhe(data);
        } catch (e: any) {
            if (isAbortError(e)) return;
            const msgErr = e instanceof ErroHttp ? e.message : e?.message;
            alert(msgErr || "Não foi possível abrir a conversa.");
            setConversaAbertaId(null);
        }
    }

    // Abrir conversa vinda do sino (navigate state)
    useEffect(() => {
        const id = (location.state as any)?.openConversationId;
        if (!id) return;

        abrirConversa(String(id));

        // limpa o state para não reabrir ao atualizar
        navigate("/fale-com-rh", { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state]);

    // Listeners de tempo real
    useEffect(() => {
        const s = getSocket();
        if (!s) return;

        const onMessage = (payload: any) => {
            const cid = String(payload?.conversationId ?? "");
            if (!cid) return;

            // Se a conversa aberta é essa, append na tela
            if (cid === conversaAbertaId) {
                const message = payload?.message;
                if (!message?.id) return;

                setDetalhe((prev) => {
                    if (!prev) return prev;

                    const exists = (prev.messages || []).some((m: any) => String(m.id) === String(message.id));
                    if (exists) return prev;

                    return { ...prev, messages: [...(prev.messages || []), message] };
                });
            }
        };

        const onConvUpdate = (payload: any) => {
            const cid = String(payload?.conversationId ?? "");
            if (!cid) return;

            const patch = payload?.patch || {};
            setConversas((prev) =>
                prev.map((c) => (String(c.id) === cid ? ({ ...c, ...patch } as any) : c))
            );

            // Se a conversa aberta é essa, atualiza status/last_message também no detalhe
            if (cid === conversaAbertaId) {
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
    }, [conversaAbertaId]);

    const conversaAtual = detalhe?.conversation;
    const podeEnviar = Boolean(conversaAtual && conversaAtual.status !== "FECHADA");

    const sugestoesAssunto = useMemo(() => {
        return CATEGORIAS.find((c) => c.value === categoria)?.sugestoes || [];
    }, [categoria]);

    async function criarConversa() {
        if (!sessao?.token) return;

        const body = {
            categoria,
            assunto: assunto.trim(),
            mensagem: mensagemInicial.trim()
        };

        if (body.assunto.length < 3) {
            setErro("Informe um assunto válido (mínimo 3 caracteres).");
            return;
        }
        if (body.mensagem.length < 3) {
            setErro("Informe a mensagem (mínimo 3 caracteres).");
            return;
        }

        setErro(null);
        try {
            const resp = await colabCriarConversa({ token: sessao.token, body });
            setModalNova(false);
            setAssunto("");
            setMensagemInicial("");

            await carregarLista();

            const newId = resp?.conversation?.id;
            if (newId) abrirConversa(newId);
        } catch (e: any) {
            const msgErr = e instanceof ErroHttp ? e.message : e?.message;
            setErro(msgErr || "Não foi possível criar a conversa.");
        }
    }

    async function enviarMensagem() {
        if (!sessao?.token || !conversaAbertaId) return;
        const texto = msg.trim();
        if (!texto) return;

        setMsg("");
        try {
            // Envia para o backend
            await colabEnviarMensagem({ token: sessao.token, id: conversaAbertaId, body: { conteudo: texto } });

            // Fallback de consistência (mantém seu comportamento atual)
            const data = await colabObterConversa({ token: sessao.token, id: conversaAbertaId });
            setDetalhe(data);

            await carregarLista();
        } catch (e: any) {
            const msgErr = e instanceof ErroHttp ? e.message : e?.message;
            alert(msgErr || "Não foi possível enviar a mensagem.");
            setMsg(texto);
        }
    }

    async function fecharConversa() {
        if (!sessao?.token || !conversaAbertaId) return;
        const ok = window.confirm("Deseja encerrar esta conversa? Após fechar, não será possível enviar novas mensagens.");
        if (!ok) return;

        try {
            await colabFecharConversa({ token: sessao.token, id: conversaAbertaId });

            const data = await colabObterConversa({ token: sessao.token, id: conversaAbertaId });
            setDetalhe(data);

            await carregarLista();
        } catch (e: any) {
            const msgErr = e instanceof ErroHttp ? e.message : e?.message;
            alert(msgErr || "Não foi possível fechar a conversa.");
        }
    }

    return (
        <div className="paginaBase">
            <BarraTopo
                busca=""
                aoMudarBusca={() => { }}
                mostrarBusca={false}
                aoIrParaInicio={() => navigate("/")}

                estaLogado={Boolean(estaLogadoColab)}
                role={"COLAB"}  // ou role={sessao?.role} se você tiver aqui

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
                    <h1 className="paginaBase__titulo">Fale com o RH</h1>
                </div>

                {erro ? (
                    <div className="rh__alert card cardErro">
                        <ShieldAlert size={18} />
                        <div>{erro}</div>
                    </div>
                ) : null}

                <section className="rh__layout">
                    <aside className="card rh__lista">
                        <div className="rh__listaTopo">
                            <div className="rh__listaTitulo">
                                <MessageSquare size={18} />
                                Suas conversas
                            </div>
                            <button type="button" className="rh__btnNovo" onClick={() => setModalNova(true)}>
                                <Plus size={18} /> Nova
                            </button>
                        </div>

                        {estado === "carregando" ? <div className="rh__placeholder">Carregando...</div> : null}
                        {estado === "erro" ? <div className="rh__placeholder">Não foi possível carregar.</div> : null}

                        {estado === "pronto" && conversas.length === 0 ? (
                            <div className="rh__placeholder">Nenhuma conversa ainda. Clique em “Nova” para iniciar.</div>
                        ) : null}

                        {estado === "pronto" && conversas.length > 0 ? (
                            <div className="rh__listaItens">
                                {conversas.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        className={`rh__item ${c.id === conversaAbertaId ? "ativo" : ""}`}
                                        onClick={() => abrirConversa(c.id)}
                                    >
                                        <div className="rh__itemTopo">
                                            <div className="rh__badge">{String(c.categoria)}</div>
                                            <div className={`rh__status ${String(c.status || "").toLowerCase()}`}>{c.status}</div>
                                        </div>
                                        <div className="rh__assunto">{c.assunto || "(Sem assunto)"}</div>
                                        <div className="rh__meta">
                                            Última atualização: {String((c as any).last_message_at || c.created_at || "").slice(0, 19).replace("T", " ")}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </aside>

                    <section className="card rh__chat">
                        {!conversaAbertaId ? (
                            <div className="rh__chatVazio">Selecione uma conversa ao lado, ou crie uma nova.</div>
                        ) : !detalhe ? (
                            <div className="rh__chatVazio">Carregando conversa...</div>
                        ) : (
                            <>
                                <div className="rh__chatHeader">
                                    <div>
                                        <div className="rh__chatTitulo">{detalhe.conversation.assunto || "(Sem assunto)"}</div>
                                        <div className="rh__chatSub">
                                            {String(detalhe.conversation.categoria)} • <strong>{detalhe.conversation.status}</strong>
                                        </div>
                                    </div>

                                    {detalhe.conversation.status !== "FECHADA" ? (
                                        <button type="button" className="rh__btnFechar" onClick={fecharConversa}>
                                            <XCircle size={16} /> Encerrar
                                        </button>
                                    ) : (
                                        <div className="rh__fechadaTag">Conversa encerrada</div>
                                    )}
                                </div>

                                <div className="rh__msgs">
                                    {(detalhe.messages || []).length === 0 ? (
                                        <div className="rh__chatVazio" style={{ minHeight: 120 }}>
                                            Nenhuma mensagem ainda.
                                        </div>
                                    ) : (
                                        (detalhe.messages || []).map((m: any) => (
                                            <div key={m.id} className={`rh__msg ${m.sender_role === "COLAB" ? "eu" : "rh"}`}>
                                                <div className="rh__msgBolha">
                                                    <div className="rh__msgTexto">{m.conteudo}</div>
                                                    <div className="rh__msgMeta">
                                                        {m.sender_role === "COLAB" ? "Você" : "RH"} •{" "}
                                                        {String(m.created_at || "").slice(0, 19).replace("T", " ")}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="rh__composer">
                                    <input
                                        value={msg}
                                        onChange={(e) => setMsg(e.target.value)}
                                        placeholder={podeEnviar ? "Digite sua mensagem..." : "Conversa encerrada"}
                                        disabled={!podeEnviar}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") enviarMensagem();
                                        }}
                                    />
                                    <button type="button" onClick={enviarMensagem} disabled={!podeEnviar || !msg.trim()}>
                                        <Send size={16} />
                                        Enviar
                                    </button>
                                </div>
                            </>
                        )}
                    </section>
                </section>
            </main>

            <Modal aberto={modalNova} titulo="Nova conversa com o RH" aoFechar={() => setModalNova(false)}>
                <div className="rh__modalGrid">
                    {erro ? (
                        <div className="rh__modalErro">
                            <ShieldAlert size={16} />
                            <div>{erro}</div>
                        </div>
                    ) : null}

                    <label className="rh__campo">
                        <span>Categoria</span>
                        <select value={categoria} onChange={(e) => setCategoria(e.target.value as any)}>
                            {CATEGORIAS.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="rh__campo">
                        <span>Assunto</span>
                        <input
                            value={assunto}
                            onChange={(e) => setAssunto(e.target.value)}
                            placeholder="Digite ou selecione uma sugestão abaixo"
                        />
                    </label>

                    <div className="rh__sugestoes">
                        {sugestoesAssunto.map((s) => (
                            <button key={s} type="button" className="rh__chip" onClick={() => setAssunto(s)}>
                                {s}
                            </button>
                        ))}
                    </div>

                    <label className="rh__campo">
                        <span>Mensagem</span>
                        <textarea
                            value={mensagemInicial}
                            onChange={(e) => setMensagemInicial(e.target.value)}
                            rows={6}
                            placeholder="Descreva sua solicitação com detalhes."
                        />
                    </label>

                    <div className="rh__modalAcoes">
                        <button type="button" onClick={criarConversa} className="rh__btnPrimario">
                            Criar conversa
                        </button>
                        <button type="button" onClick={() => setModalNova(false)} className="rh__btnGhost">
                            Cancelar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
