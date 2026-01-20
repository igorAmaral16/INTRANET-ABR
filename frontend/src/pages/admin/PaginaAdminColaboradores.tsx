import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Search,
    Filter,
    Plus,
    User,
    BadgeCheck,
    BadgeX,
    Trash2,
    Users,
    X,
    Save,
} from "lucide-react";

import { BarraTopo } from "../../components/BarraTopo/BarraTopo";
import { Modal } from "../../components/Modal/Modal";
import { useSessaoAuth } from "../../hooks/useSessaoAuth";
import { ErroHttp } from "../../api/clienteHttp";
import {
    listarColaboradoresAdmin,
    obterColaboradorAdmin,
    criarColaboradorAdmin,
    atualizarColaboradorAdmin,
    excluirColaboradorAdmin,
    type ColaboradorAdmin,
} from "../../api/colaborador.api";

import "./PaginaAdminColaboradores.css";

function isAbortError(e: any) {
    return e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("abort");
}

function formatarDataBR(valor: string) {
    if (!valor) return "";
    const d = new Date(valor);
    if (!Number.isFinite(d.getTime())) {
        const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[3]}/${m[2]}/${m[1]}`;
        return valor;
    }
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function iniciais(nome: string) {
    const n = String(nome || "").trim();
    if (!n) return "??";
    const partes = n.split(/\s+/).filter(Boolean);
    const a = partes[0]?.[0] || "?";
    const b = partes.length > 1 ? partes[partes.length - 1]?.[0] : "";
    return `${a}${b}`.toUpperCase();
}

export function PaginaAdminColaboradores() {
    const navigate = useNavigate();
    const { sessao, estaLogadoAdmin, sair } = useSessaoAuth();

    const [estado, setEstado] = useState<"carregando" | "erro" | "pronto">("carregando");
    const [erro, setErro] = useState<string | null>(null);

    const [items, setItems] = useState<ColaboradorAdmin[]>([]);
    const [total, setTotal] = useState(0);

    const [search, setSearch] = useState("");
    const [filtroStatus, setFiltroStatus] = useState<"TODOS" | "ATIVO" | "INATIVO">("TODOS");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const [modalFiltros, setModalFiltros] = useState(false);

    const [modalNovo, setModalNovo] = useState(false);
    const [novoMatricula, setNovoMatricula] = useState("");
    const [novoNome, setNovoNome] = useState("");
    const [novoNascimento, setNovoNascimento] = useState(""); // dd/mm/aaaa
    const [novoStatus, setNovoStatus] = useState<"ATIVO" | "INATIVO">("ATIVO");
    const [criando, setCriando] = useState(false);

    const [modalDetalhe, setModalDetalhe] = useState<{ matricula: string } | null>(null);
    const [detalheCarregando, setDetalheCarregando] = useState(false);
    const [detalhe, setDetalhe] = useState<ColaboradorAdmin | null>(null);
    const [editNome, setEditNome] = useState("");
    const [editNascimento, setEditNascimento] = useState("");
    const [editStatus, setEditStatus] = useState<"ATIVO" | "INATIVO">("ATIVO");
    const [salvando, setSalvando] = useState(false);

    const [confirmExclusao, setConfirmExclusao] = useState("");
    const [excluindo, setExcluindo] = useState(false);

    const acRef = useRef<AbortController | null>(null);

    const estaLogado = Boolean(sessao?.token);
    const role = sessao?.role;

    useEffect(() => {
        if (!estaLogadoAdmin || !sessao?.token) {
            navigate("/", { replace: true });
            return;
        }
    }, [estaLogadoAdmin, sessao?.token, navigate]);

    // debounce “leve”: a lista recarrega ao mudar search, mas resetando página
    const buscaDebounced = useMemo(() => search.trim(), [search]);
    useEffect(() => {
        setPage(1);
    }, [buscaDebounced, filtroStatus, pageSize]);

    async function carregarLista(signal?: AbortSignal) {
        if (!sessao?.token) return;

        setEstado("carregando");
        setErro(null);

        try {
            const resp = await listarColaboradoresAdmin(
                {
                    token: sessao.token,
                    page,
                    pageSize,
                    status: filtroStatus === "TODOS" ? undefined : filtroStatus,
                    search: buscaDebounced || undefined,
                },
                signal
            );

            setItems(resp.items || []);
            setTotal(resp.total || 0);
            setEstado("pronto");
        } catch (e: any) {
            if (isAbortError(e)) return;
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            setErro(msg || "Não foi possível carregar os colaboradores.");
            setEstado("erro");
        }
    }

    useEffect(() => {
        acRef.current?.abort();
        const ac = new AbortController();
        acRef.current = ac;

        carregarLista(ac.signal);

        return () => ac.abort();
    }, [page, pageSize, filtroStatus, buscaDebounced, sessao?.token]);

    async function abrirDetalhe(matricula: string) {
        if (!sessao?.token) return;

        setModalDetalhe({ matricula });
        setDetalhe(null);
        setDetalheCarregando(true);
        setConfirmExclusao("");

        try {
            const data = await obterColaboradorAdmin({ token: sessao.token, matricula });
            setDetalhe(data);
            setEditNome(data.nome_completo);
            setEditNascimento(formatarDataBR(data.data_nascimento));
            setEditStatus(data.status);
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível abrir o colaborador.");
            setModalDetalhe(null);
        } finally {
            setDetalheCarregando(false);
        }
    }

    const alterou = useMemo(() => {
        if (!detalhe) return false;
        return (
            editNome.trim() !== (detalhe.nome_completo || "").trim() ||
            editNascimento.trim() !== formatarDataBR(detalhe.data_nascimento || "").trim() ||
            editStatus !== detalhe.status
        );
    }, [detalhe, editNome, editNascimento, editStatus]);

    async function salvarAlteracoes() {
        if (!sessao?.token || !detalhe) return;

        if (editNome.trim().length < 3) return alert("Informe o nome completo (mín. 3).");
        if (editNascimento.trim().length !== 10) return alert("Data inválida. Use dd/mm/aaaa.");

        setSalvando(true);
        try {
            await atualizarColaboradorAdmin({
                token: sessao.token,
                matricula: detalhe.matricula,
                body: {
                    nome_completo: editNome.trim(),
                    data_nascimento: editNascimento.trim(), // dd/mm/aaaa
                    status: editStatus,
                },
            });

            setModalDetalhe(null);
            await carregarLista();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível salvar alterações.");
        } finally {
            setSalvando(false);
        }
    }

    async function excluirColaborador() {
        if (!sessao?.token || !detalhe) return;

        const expected = `EXCLUIR ${detalhe.matricula}`.toUpperCase();
        if (confirmExclusao.trim().toUpperCase() !== expected) {
            alert(`Confirmação inválida. Digite exatamente: ${expected}`);
            return;
        }

        const ok = window.confirm("Confirmar exclusão definitiva do colaborador?");
        if (!ok) return;

        setExcluindo(true);
        try {
            await excluirColaboradorAdmin({
                token: sessao.token,
                matricula: detalhe.matricula,
                confirm: confirmExclusao,
            });

            setModalDetalhe(null);
            await carregarLista();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível excluir o colaborador.");
        } finally {
            setExcluindo(false);
        }
    }

    async function criarNovo() {
        if (!sessao?.token) return;

        const body = {
            matricula: novoMatricula.trim(),
            nome_completo: novoNome.trim(),
            data_nascimento: novoNascimento.trim(),
            status: novoStatus,
        };

        if (!body.matricula) return alert("Informe a matrícula.");
        if (body.nome_completo.length < 3) return alert("Informe o nome completo (mín. 3).");
        if (body.data_nascimento.length !== 10) return alert("Data inválida. Use dd/mm/aaaa.");

        setCriando(true);
        try {
            await criarColaboradorAdmin({ token: sessao.token, body });
            setModalNovo(false);
            setNovoMatricula("");
            setNovoNome("");
            setNovoNascimento("");
            setNovoStatus("ATIVO");
            await carregarLista();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível criar o colaborador.");
        } finally {
            setCriando(false);
        }
    }

    const totalPaginas = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

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
                aoAdminFaleComRh={() => navigate("/admin/fale-com-rh")}   // NOVO
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

                    <div className="admColabs__header">
                        <h1 className="paginaBase__titulo">Admin — Colaboradores</h1>
                        <div className="admColabs__subtitulo">
                            Gerencie cadastro, status e dados de colaboradores. <span className="admColabs__dot">•</span>{" "}
                            <strong>{total}</strong> registros
                        </div>
                    </div>
                </div>

                <section className="admColabs__toolbar card">
                    <div className="admColabs__busca">
                        <Search size={16} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por matrícula ou nome"
                            aria-label="Buscar colaboradores"
                        />
                        {search ? (
                            <button
                                type="button"
                                className="admColabs__clear"
                                aria-label="Limpar busca"
                                onClick={() => setSearch("")}
                            >
                                <X size={16} />
                            </button>
                        ) : null}
                    </div>

                    <div className="admColabs__chips">
                        <button
                            type="button"
                            className={`admColabs__chip ${filtroStatus === "TODOS" ? "ativo" : ""}`}
                            onClick={() => setFiltroStatus("TODOS")}
                        >
                            <Users size={16} /> Todos
                        </button>
                        <button
                            type="button"
                            className={`admColabs__chip ${filtroStatus === "ATIVO" ? "ativo" : ""}`}
                            onClick={() => setFiltroStatus("ATIVO")}
                        >
                            <BadgeCheck size={16} /> Ativos
                        </button>
                        <button
                            type="button"
                            className={`admColabs__chip ${filtroStatus === "INATIVO" ? "ativo" : ""}`}
                            onClick={() => setFiltroStatus("INATIVO")}
                        >
                            <BadgeX size={16} /> Inativos
                        </button>
                    </div>

                    <button type="button" className="admColabs__btn" onClick={() => setModalFiltros(true)}>
                        <Filter size={18} /> Filtros
                    </button>
                </section>

                {estado === "carregando" ? <div className="card">Carregando...</div> : null}
                {estado === "erro" ? (
                    <div className="card cardErro">
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>Não foi possível carregar</div>
                        <div style={{ opacity: 0.85 }}>{erro}</div>
                        <div style={{ marginTop: 10 }}>
                            <button type="button" onClick={() => carregarLista()}>
                                Tentar novamente
                            </button>
                        </div>
                    </div>
                ) : null}

                {estado === "pronto" ? (
                    <section className="admColabs__lista card">
                        <div className="admColabs__listaTopo">
                            <div className="admColabs__totalPill">
                                <Users size={16} />
                                <span>
                                    Exibindo <strong>{items.length}</strong> de <strong>{total}</strong>
                                </span>
                            </div>

                            <div className="admColabs__paginacao">
                                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                                    Anterior
                                </button>
                                <span className="admColabs__pageTxt">
                                    Página <strong>{page}</strong> de <strong>{totalPaginas}</strong>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                                    disabled={page >= totalPaginas}
                                >
                                    Próxima
                                </button>

                                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} aria-label="Itens por página">
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>

                        {items.length === 0 ? (
                            <div className="admColabs__vazio">
                                <div className="admColabs__vazioTitulo">Nenhum colaborador encontrado</div>
                                <div className="admColabs__vazioSub">
                                    Ajuste os filtros ou refine a busca por matrícula/nome.
                                </div>
                                <div style={{ marginTop: 10 }}>
                                    <button type="button" onClick={() => setModalNovo(true)}>
                                        <Plus size={18} /> Cadastrar colaborador
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="admColabs__grid">
                                {items.map((c) => (
                                    <button
                                        key={c.matricula}
                                        type="button"
                                        className="admColabs__card"
                                        onClick={() => abrirDetalhe(c.matricula)}
                                    >
                                        <div className="admColabs__cardTop">
                                            <div className="admColabs__avatar" aria-hidden="true">
                                                {iniciais(c.nome_completo)}
                                            </div>

                                            <div className={`admColabs__statusPill ${c.status === "ATIVO" ? "ativo" : "inativo"}`}>
                                                {c.status === "ATIVO" ? <BadgeCheck size={16} /> : <BadgeX size={16} />}
                                                {c.status}
                                            </div>
                                        </div>

                                        <div className="admColabs__nome" title={c.nome_completo}>
                                            {c.nome_completo}
                                        </div>

                                        <div className="admColabs__meta">
                                            <span className="admColabs__metaItem">
                                                <User size={14} /> Matrícula: <strong>{c.matricula}</strong>
                                            </span>
                                            <span className="admColabs__metaItem">
                                                Nasc.: <strong>{formatarDataBR(c.data_nascimento)}</strong>
                                            </span>
                                        </div>

                                        <div className="admColabs__cardHint">Clique para abrir, editar ou excluir</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                ) : null}

                {/* Botão flutuante + */}
                <button type="button" className="admColabs__fab" aria-label="Adicionar colaborador" onClick={() => setModalNovo(true)}>
                    <Plus size={20} />
                </button>
            </main>

            {/* Modal filtros */}
            <Modal aberto={modalFiltros} titulo="Filtros" aoFechar={() => setModalFiltros(false)}>
                <div className="admColabs__modalGrid">
                    <label className="admColabs__modalCampo">
                        <span>Status</span>
                        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as any)}>
                            <option value="TODOS">Todos</option>
                            <option value="ATIVO">Ativo</option>
                            <option value="INATIVO">Inativo</option>
                        </select>
                    </label>

                    <label className="admColabs__modalCampo">
                        <span>Itens por página</span>
                        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </label>

                    <div className="admColabs__modalAcoes">
                        <button type="button" onClick={() => setModalFiltros(false)}>
                            Aplicar
                        </button>
                        <button
                            type="button"
                            className="admColabs__ghost"
                            onClick={() => {
                                setFiltroStatus("TODOS");
                                setPageSize(20);
                                setModalFiltros(false);
                            }}
                        >
                            Limpar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal novo */}
            <Modal aberto={modalNovo} titulo="Novo colaborador" aoFechar={() => setModalNovo(false)}>
                <div className="admColabs__modalGrid">
                    <label className="admColabs__modalCampo">
                        <span>Matrícula</span>
                        <input value={novoMatricula} onChange={(e) => setNovoMatricula(e.target.value)} placeholder="ex: 12345" />
                    </label>

                    <label className="admColabs__modalCampo">
                        <span>Nome completo</span>
                        <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome do colaborador" />
                    </label>

                    <label className="admColabs__modalCampo">
                        <span>Data de nascimento (dd/mm/aaaa)</span>
                        <input value={novoNascimento} onChange={(e) => setNovoNascimento(e.target.value)} placeholder="dd/mm/aaaa" />
                    </label>

                    <label className="admColabs__modalCampo">
                        <span>Status</span>
                        <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value as any)}>
                            <option value="ATIVO">ATIVO</option>
                            <option value="INATIVO">INATIVO</option>
                        </select>
                    </label>

                    <div className="admColabs__modalAcoes">
                        <button type="button" onClick={criarNovo} disabled={criando}>
                            {criando ? "Criando..." : <><Plus size={18} /> Criar</>}
                        </button>
                        <button type="button" className="admColabs__ghost" onClick={() => setModalNovo(false)} disabled={criando}>
                            Cancelar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal detalhe/edição */}
            <Modal
                aberto={Boolean(modalDetalhe)}
                titulo={modalDetalhe ? `Colaborador: ${modalDetalhe.matricula}` : "Colaborador"}
                aoFechar={() => setModalDetalhe(null)}
            >
                {detalheCarregando ? (
                    <div className="admColabs__modalLoading">Carregando...</div>
                ) : detalhe ? (
                    <div className="admColabs__detalheGrid">
                        <div className="admColabs__detalheCard">
                            <div className="admColabs__detalheResumo">
                                <div className="admColabs__avatar grande" aria-hidden="true">
                                    {iniciais(detalhe.nome_completo)}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div className="admColabs__detalheNome" title={detalhe.nome_completo}>
                                        {detalhe.nome_completo}
                                    </div>
                                    <div className="admColabs__detalheMeta">
                                        Matrícula: <strong>{detalhe.matricula}</strong> • Nasc.:{" "}
                                        <strong>{formatarDataBR(detalhe.data_nascimento)}</strong>
                                    </div>
                                </div>

                                <div className={`admColabs__statusPill ${detalhe.status === "ATIVO" ? "ativo" : "inativo"}`}>
                                    {detalhe.status === "ATIVO" ? <BadgeCheck size={16} /> : <BadgeX size={16} />}
                                    {detalhe.status}
                                </div>
                            </div>

                            <div className="admColabs__divider" />

                            <div className="admColabs__formGrid">
                                <label className="admColabs__modalCampo">
                                    <span>Matrícula</span>
                                    <input value={detalhe.matricula} readOnly />
                                </label>

                                <label className="admColabs__modalCampo">
                                    <span>Nome completo</span>
                                    <input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                                </label>

                                <label className="admColabs__modalCampo">
                                    <span>Data de nascimento (dd/mm/aaaa)</span>
                                    <input value={editNascimento} onChange={(e) => setEditNascimento(e.target.value)} placeholder="dd/mm/aaaa" />
                                </label>

                                <label className="admColabs__modalCampo">
                                    <span>Status</span>
                                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)}>
                                        <option value="ATIVO">ATIVO</option>
                                        <option value="INATIVO">INATIVO</option>
                                    </select>
                                </label>
                            </div>

                            <div className="admColabs__modalAcoes">
                                <button type="button" onClick={salvarAlteracoes} disabled={!alterou || salvando}>
                                    {salvando ? "Salvando..." : <><Save size={18} /> Salvar alterações</>}
                                </button>
                                <button type="button" className="admColabs__ghost" onClick={() => setModalDetalhe(null)} disabled={salvando}>
                                    Fechar
                                </button>
                            </div>
                        </div>

                        <div className="admColabs__detalheDanger">
                            <div className="admColabs__dangerTitulo">Zona de risco</div>
                            <div className="admColabs__dangerTexto">
                                Para excluir definitivamente, digite exatamente:
                                <div className="admColabs__dangerCode">EXCLUIR {detalhe.matricula}</div>
                            </div>

                            <input
                                className="admColabs__dangerInput"
                                value={confirmExclusao}
                                onChange={(e) => setConfirmExclusao(e.target.value)}
                                placeholder={`EXCLUIR ${detalhe.matricula}`}
                            />

                            <button type="button" className="admColabs__btnDanger" onClick={excluirColaborador} disabled={excluindo}>
                                {excluindo ? "Excluindo..." : <><Trash2 size={16} /> Excluir colaborador</>}
                            </button>

                            <div className="admColabs__dangerHint">
                                Esta ação não pode ser desfeita.
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>Não foi possível abrir.</div>
                )}
            </Modal>
        </div>
    );
}
