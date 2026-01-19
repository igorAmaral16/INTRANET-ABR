import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Filter, Plus, User, BadgeCheck, BadgeX, Trash2 } from "lucide-react";

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
    type ColaboradorAdmin
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

    const [modalDetalhe, setModalDetalhe] = useState<{ matricula: string } | null>(null);
    const [detalheCarregando, setDetalheCarregando] = useState(false);
    const [detalhe, setDetalhe] = useState<ColaboradorAdmin | null>(null);
    const [editNome, setEditNome] = useState("");
    const [editNascimento, setEditNascimento] = useState("");
    const [editStatus, setEditStatus] = useState<"ATIVO" | "INATIVO">("ATIVO");
    const [confirmExclusao, setConfirmExclusao] = useState("");

    const acRef = useRef<AbortController | null>(null);

    const estaLogado = Boolean(sessao?.token);
    const role = sessao?.role;

    useEffect(() => {
        if (!estaLogadoAdmin || !sessao?.token) {
            navigate("/", { replace: true });
            return;
        }
    }, [estaLogadoAdmin, sessao?.token]);

    // debounce de busca
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
                    search: buscaDebounced || undefined
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

        try {
            await atualizarColaboradorAdmin({
                token: sessao.token,
                matricula: detalhe.matricula,
                body: {
                    nome_completo: editNome.trim(),
                    data_nascimento: editNascimento.trim(), // dd/mm/aaaa
                    status: editStatus
                }
            });

            setModalDetalhe(null);
            await carregarLista();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível salvar alterações.");
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

        try {
            await excluirColaboradorAdmin({
                token: sessao.token,
                matricula: detalhe.matricula,
                confirm: confirmExclusao
            });

            setModalDetalhe(null);
            await carregarLista();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível excluir o colaborador.");
        }
    }

    async function criarNovo() {
        if (!sessao?.token) return;

        const body = {
            matricula: novoMatricula.trim(),
            nome_completo: novoNome.trim(),
            data_nascimento: novoNascimento.trim(),
            status: novoStatus
        };

        if (!body.matricula) return alert("Informe a matrícula.");
        if (body.nome_completo.length < 3) return alert("Informe o nome completo (mín. 3).");
        if (body.data_nascimento.length !== 10) return alert("Data inválida. Use dd/mm/aaaa.");

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
                estaLogado={estaLogado}
                role={role}
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
                    <h1 className="paginaBase__titulo">Admin — Colaboradores</h1>
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
                    </div>

                    <button type="button" className="admColabs__btn" onClick={() => setModalFiltros(true)}>
                        <Filter size={18} /> Filtros
                    </button>
                </section>

                {estado === "carregando" ? <div className="card">Carregando...</div> : null}
                {estado === "erro" ? <div className="card cardErro">{erro}</div> : null}

                {estado === "pronto" ? (
                    <section className="admColabs__lista card">
                        <div className="admColabs__listaTopo">
                            <div style={{ fontWeight: 900 }}>Total: {total}</div>

                            <div className="admColabs__paginacao">
                                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                                    Anterior
                                </button>
                                <span style={{ fontWeight: 900 }}>
                                    {page} / {totalPaginas}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                                    disabled={page >= totalPaginas}
                                >
                                    Próxima
                                </button>

                                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>

                        {items.length === 0 ? (
                            <div className="card">Nenhum colaborador encontrado.</div>
                        ) : (
                            <div className="admColabs__tabela">
                                {items.map((c) => (
                                    <button
                                        key={c.matricula}
                                        type="button"
                                        className="admColabs__row"
                                        onClick={() => abrirDetalhe(c.matricula)}
                                    >
                                        <div className="admColabs__rowEsq">
                                            <User size={18} />
                                            <div className="admColabs__rowTxt">
                                                <div className="admColabs__rowNome">{c.nome_completo}</div>
                                                <div className="admColabs__rowMeta">
                                                    Matrícula: <strong>{c.matricula}</strong> • Nasc.: {formatarDataBR(c.data_nascimento)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`admColabs__status ${c.status === "ATIVO" ? "ativo" : "inativo"}`}>
                                            {c.status === "ATIVO" ? <BadgeCheck size={16} /> : <BadgeX size={16} />}
                                            {c.status}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                ) : null}

                {/* Botão flutuante + */}
                <button
                    type="button"
                    className="admColabs__fab"
                    aria-label="Adicionar colaborador"
                    onClick={() => setModalNovo(true)}
                >
                    <Plus size={20} />
                </button>
            </main>

            {/* Modal filtros */}
            <Modal aberto={modalFiltros} titulo="Filtros" aoFechar={() => setModalFiltros(false)}>
                <div style={{ display: "grid", gap: 12 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 900 }}>Status</span>
                        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as any)}>
                            <option value="TODOS">Todos</option>
                            <option value="ATIVO">Ativo</option>
                            <option value="INATIVO">Inativo</option>
                        </select>
                    </label>

                    <div style={{ display: "flex", gap: 10 }}>
                        <button type="button" onClick={() => setModalFiltros(false)}>Aplicar</button>
                        <button type="button" onClick={() => { setFiltroStatus("TODOS"); setModalFiltros(false); }}>
                            Limpar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal novo */}
            <Modal aberto={modalNovo} titulo="Novo colaborador" aoFechar={() => setModalNovo(false)}>
                <div style={{ display: "grid", gap: 10 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 900 }}>Matrícula</span>
                        <input value={novoMatricula} onChange={(e) => setNovoMatricula(e.target.value)} placeholder="ex: 12345" />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 900 }}>Nome completo</span>
                        <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 900 }}>Data de nascimento (dd/mm/aaaa)</span>
                        <input value={novoNascimento} onChange={(e) => setNovoNascimento(e.target.value)} placeholder="dd/mm/aaaa" />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 900 }}>Status</span>
                        <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value as any)}>
                            <option value="ATIVO">ATIVO</option>
                            <option value="INATIVO">INATIVO</option>
                        </select>
                    </label>

                    <div style={{ display: "flex", gap: 10 }}>
                        <button type="button" onClick={criarNovo}>Criar</button>
                        <button type="button" onClick={() => setModalNovo(false)}>Cancelar</button>
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
                    <div>Carregando...</div>
                ) : detalhe ? (
                    <div style={{ display: "grid", gap: 12 }}>
                        <div className="admColabs__detalheBloco">
                            <div className="admColabs__detalheTitulo">Dados</div>

                            <label style={{ display: "grid", gap: 6 }}>
                                <span style={{ fontWeight: 900 }}>Matrícula</span>
                                <input value={detalhe.matricula} readOnly />
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                <span style={{ fontWeight: 900 }}>Nome completo</span>
                                <input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                <span style={{ fontWeight: 900 }}>Data de nascimento (dd/mm/aaaa)</span>
                                <input value={editNascimento} onChange={(e) => setEditNascimento(e.target.value)} placeholder="dd/mm/aaaa" />
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                <span style={{ fontWeight: 900 }}>Status</span>
                                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)}>
                                    <option value="ATIVO">ATIVO</option>
                                    <option value="INATIVO">INATIVO</option>
                                </select>
                            </label>

                            <button type="button" onClick={salvarAlteracoes} disabled={!alterou}>
                                Salvar alterações
                            </button>
                        </div>

                        <div className="admColabs__detalheBloco admColabs__danger">
                            <div className="admColabs__detalheTitulo">Excluir</div>
                            <div style={{ opacity: 0.85 }}>
                                Para excluir, digite exatamente: <strong>EXCLUIR {detalhe.matricula}</strong>
                            </div>

                            <input
                                value={confirmExclusao}
                                onChange={(e) => setConfirmExclusao(e.target.value)}
                                placeholder={`EXCLUIR ${detalhe.matricula}`}
                            />

                            <button type="button" className="admColabs__btnDanger" onClick={excluirColaborador}>
                                <Trash2 size={16} /> Excluir colaborador
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>Não foi possível abrir.</div>
                )}
            </Modal>
        </div>
    );
}
