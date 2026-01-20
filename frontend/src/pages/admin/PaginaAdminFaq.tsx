import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Search,
    Filter,
    Plus,
    HelpCircle,
    Tag,
    BadgeCheck,
    BadgeX,
    Trash2,
    ShieldAlert,
    Save,
} from "lucide-react";

import { BarraTopo } from "../../components/BarraTopo/BarraTopo";
import { Modal } from "../../components/Modal/Modal";
import { useSessaoAuth } from "../../hooks/useSessaoAuth";
import { ErroHttp } from "../../api/clienteHttp";
import {
    listarFaqAdmin,
    obterFaqAdmin,
    criarFaqAdmin,
    atualizarFaqAdmin,
    excluirFaqAdmin,
    type FaqItem,
    type FaqAdminPayload,
} from "../../api/faq.api";

import "../../pages/PaginaBase.css";
import "./PaginaAdminFaq.css";

function isAbortError(e: any) {
    return e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("abort");
}

function normalizarBoolean(v: any, fallback: boolean) {
    if (v === true || v === "true" || v === 1 || v === "1") return true;
    if (v === false || v === "false" || v === 0 || v === "0") return false;
    return fallback;
}

function toInt(v: any, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

export function PaginaAdminFaq() {
    const navigate = useNavigate();
    const { sessao, estaLogadoAdmin, sair } = useSessaoAuth();

    const [estado, setEstado] = useState<"carregando" | "erro" | "pronto">("carregando");
    const [erro, setErro] = useState<string | null>(null);

    const [items, setItems] = useState<FaqItem[]>([]);

    const [search, setSearch] = useState("");
    const [modalFiltros, setModalFiltros] = useState(false);

    // filtros
    const [filtroCategoria, setFiltroCategoria] = useState<string>("TODAS");
    const [filtroAtivo, setFiltroAtivo] = useState<"TODOS" | "ATIVO" | "INATIVO">("TODOS");
    const [ordenacao, setOrdenacao] = useState<"ORDEM_ASC" | "TITULO_ASC" | "CATEGORIA_ASC">("ORDEM_ASC");

    // modal novo
    const [modalNovo, setModalNovo] = useState(false);
    const [novoTitulo, setNovoTitulo] = useState("");
    const [novoCategoria, setNovoCategoria] = useState("GERAL");
    const [novoDescricao, setNovoDescricao] = useState("");
    const [novoAtivo, setNovoAtivo] = useState(true);
    const [novoOrdem, setNovoOrdem] = useState<string>("");

    // modal detalhe/edição
    const [modalDetalhe, setModalDetalhe] = useState<{ id: number } | null>(null);
    const [detalheCarregando, setDetalheCarregando] = useState(false);
    const [detalhe, setDetalhe] = useState<any | null>(null);

    const [editTitulo, setEditTitulo] = useState("");
    const [editCategoria, setEditCategoria] = useState("");
    const [editDescricao, setEditDescricao] = useState("");
    const [editAtivo, setEditAtivo] = useState(true);
    const [editOrdem, setEditOrdem] = useState<string>("");

    const [confirmExclusao, setConfirmExclusao] = useState("");
    const [processando, setProcessando] = useState(false);

    const acRef = useRef<AbortController | null>(null);

    const estaLogado = Boolean(sessao?.token);
    const role = sessao?.role;

    useEffect(() => {
        if (!estaLogadoAdmin || !sessao?.token) {
            navigate("/", { replace: true });
            return;
        }
    }, [estaLogadoAdmin, sessao?.token, navigate]);

    async function carregarLista(signal?: AbortSignal) {
        if (!sessao?.token) return;

        setEstado("carregando");
        setErro(null);

        try {
            const data = await listarFaqAdmin({ token: sessao.token }, signal);
            setItems(data || []);
            setEstado("pronto");
        } catch (e: any) {
            if (isAbortError(e)) return;
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            setErro(msg || "Não foi possível carregar o FAQ.");
            setEstado("erro");
        }
    }

    useEffect(() => {
        acRef.current?.abort();
        const ac = new AbortController();
        acRef.current = ac;

        carregarLista(ac.signal);

        return () => ac.abort();
    }, [sessao?.token]);

    const categorias = useMemo(() => {
        const set = new Set<string>();
        for (const x of items) {
            const c = String(x.categoria || "GERAL").trim() || "GERAL";
            set.add(c);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [items]);

    const filtrados = useMemo(() => {
        const q = search.trim().toLowerCase();

        let arr = items.slice();

        // filtro categoria
        if (filtroCategoria !== "TODAS") {
            arr = arr.filter((x) => String(x.categoria || "GERAL") === filtroCategoria);
        }

        // filtro ativo
        if (filtroAtivo !== "TODOS") {
            const want = filtroAtivo === "ATIVO";
            arr = arr.filter((x) => normalizarBoolean(x.ativo, true) === want);
        }

        // busca
        if (q) {
            arr = arr.filter((x) => {
                const hay = `${x.titulo || ""} ${x.categoria || ""} ${x.descricao || ""}`.toLowerCase();
                return hay.includes(q);
            });
        }

        // ordenação
        if (ordenacao === "ORDEM_ASC") {
            arr.sort((a, b) => {
                const oa = toInt(a.ordem, 999999);
                const ob = toInt(b.ordem, 999999);
                if (oa !== ob) return oa - ob;
                return String(a.titulo || "").localeCompare(String(b.titulo || ""));
            });
        } else if (ordenacao === "TITULO_ASC") {
            arr.sort((a, b) => String(a.titulo || "").localeCompare(String(b.titulo || "")));
        } else {
            arr.sort((a, b) => String(a.categoria || "").localeCompare(String(b.categoria || "")));
        }

        return arr;
    }, [items, search, filtroCategoria, filtroAtivo, ordenacao]);

    const totalAtivos = useMemo(() => items.filter((x) => normalizarBoolean(x.ativo, true)).length, [items]);

    async function abrirDetalhe(id: number) {
        if (!sessao?.token) return;

        setModalDetalhe({ id });
        setDetalhe(null);
        setDetalheCarregando(true);
        setConfirmExclusao("");
        setProcessando(false);

        try {
            const data = await obterFaqAdmin({ token: sessao.token, id });
            setDetalhe(data);

            setEditTitulo(String(data?.titulo || ""));
            setEditCategoria(String(data?.categoria || "GERAL"));
            setEditDescricao(String(data?.descricao || ""));
            setEditAtivo(normalizarBoolean(data?.ativo, true));
            setEditOrdem(data?.ordem !== undefined && data?.ordem !== null ? String(data.ordem) : "");
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível abrir o item do FAQ.");
            setModalDetalhe(null);
        } finally {
            setDetalheCarregando(false);
        }
    }

    const alterou = useMemo(() => {
        if (!detalhe) return false;

        const t0 = String(detalhe?.titulo || "").trim();
        const c0 = String(detalhe?.categoria || "GERAL").trim();
        const d0 = String(detalhe?.descricao || "").trim();
        const a0 = normalizarBoolean(detalhe?.ativo, true);
        const o0 = detalhe?.ordem !== undefined && detalhe?.ordem !== null ? String(detalhe.ordem) : "";

        return (
            editTitulo.trim() !== t0 ||
            editCategoria.trim() !== c0 ||
            editDescricao.trim() !== d0 ||
            editAtivo !== a0 ||
            editOrdem.trim() !== o0
        );
    }, [detalhe, editTitulo, editCategoria, editDescricao, editAtivo, editOrdem]);

    async function salvarAlteracoes() {
        if (!sessao?.token || !modalDetalhe) return;

        const body: FaqAdminPayload = {
            titulo: editTitulo.trim(),
            categoria: editCategoria.trim() || "GERAL",
            descricao: editDescricao.trim(),
            ativo: editAtivo,
            ordem: editOrdem.trim() ? Number(editOrdem.trim()) : undefined,
        };

        if (body.titulo.length < 3) return alert("Informe um título válido (mínimo 3 caracteres).");
        if (body.descricao.length < 3) return alert("Informe uma descrição válida (mínimo 3 caracteres).");

        setProcessando(true);
        try {
            await atualizarFaqAdmin({ token: sessao.token, id: modalDetalhe.id, body });
            setModalDetalhe(null);
            await carregarLista();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível salvar alterações.");
        } finally {
            setProcessando(false);
        }
    }

    async function excluirItemFaq() {
        if (!sessao?.token || !modalDetalhe) return;

        const expected = `EXCLUIR ${modalDetalhe.id}`.toUpperCase();
        if (confirmExclusao.trim().toUpperCase() !== expected) {
            alert(`Confirmação inválida. Digite exatamente: ${expected}`);
            return;
        }

        const ok = window.confirm("Confirmar exclusão definitiva deste item do FAQ?");
        if (!ok) return;

        setProcessando(true);
        try {
            await excluirFaqAdmin({ token: sessao.token, id: modalDetalhe.id });
            setModalDetalhe(null);
            await carregarLista();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível excluir o item do FAQ.");
        } finally {
            setProcessando(false);
        }
    }

    async function criarNovo() {
        if (!sessao?.token) return;

        const body: FaqAdminPayload = {
            titulo: novoTitulo.trim(),
            categoria: (novoCategoria.trim() || "GERAL").toUpperCase(),
            descricao: novoDescricao.trim(),
            ativo: novoAtivo,
            ordem: novoOrdem.trim() ? Number(novoOrdem.trim()) : undefined,
        };

        if (body.titulo.length < 3) return alert("Informe um título válido (mínimo 3).");
        if (body.descricao.length < 3) return alert("Informe uma descrição válida (mínimo 3).");
        if (novoOrdem.trim() && !Number.isFinite(Number(novoOrdem.trim()))) return alert("Ordem inválida.");

        setProcessando(true);
        try {
            await criarFaqAdmin({ token: sessao.token, body });
            setModalNovo(false);
            setNovoTitulo("");
            setNovoCategoria("GERAL");
            setNovoDescricao("");
            setNovoAtivo(true);
            setNovoOrdem("");
            await carregarLista();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível criar o item do FAQ.");
        } finally {
            setProcessando(false);
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

                    <div className="admFaq__header">
                        <h1 className="paginaBase__titulo">Admin — FAQ</h1>
                        <div className="admFaq__sub">
                            Gerencie perguntas e respostas. <span className="admFaq__dot">•</span> Total:{" "}
                            <strong>{items.length}</strong> <span className="admFaq__dot">•</span> Ativos:{" "}
                            <strong>{totalAtivos}</strong>
                        </div>
                    </div>
                </div>

                <section className="admFaq__toolbar card">
                    <div className="admFaq__busca">
                        <Search size={16} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por título, categoria ou descrição"
                            aria-label="Buscar FAQ"
                        />
                    </div>

                    <button type="button" className="admFaq__btn" onClick={() => setModalFiltros(true)}>
                        <Filter size={18} /> Filtros
                    </button>
                </section>

                {estado === "carregando" ? <div className="card">Carregando...</div> : null}
                {estado === "erro" ? (
                    <div className="admFaq__alert card cardErro">
                        <ShieldAlert size={18} />
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 900, marginBottom: 4 }}>Não foi possível carregar</div>
                            <div style={{ opacity: 0.85 }}>{erro}</div>
                            <div style={{ marginTop: 10 }}>
                                <button type="button" onClick={() => carregarLista()}>
                                    Tentar novamente
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {estado === "pronto" ? (
                    <section className="admFaq__lista card">
                        <div className="admFaq__listaTopo">
                            <div className="admFaq__listaTitulo">
                                <HelpCircle size={16} /> Itens do FAQ
                            </div>

                            <div className="admFaq__chips">
                                {filtroCategoria !== "TODAS" ? <span className="admFaq__chip">Categoria: {filtroCategoria}</span> : null}
                                {filtroAtivo !== "TODOS" ? <span className="admFaq__chip">Status: {filtroAtivo}</span> : null}
                                <span className="admFaq__chip">Ordenação: {ordenacao.replace("_", " ")}</span>
                            </div>
                        </div>

                        {filtrados.length === 0 ? (
                            <div className="admFaq__vazio">
                                Nenhum item encontrado com os filtros atuais.
                            </div>
                        ) : (
                            <div className="admFaq__grid">
                                {filtrados.map((f) => {
                                    const ativo = normalizarBoolean(f.ativo, true);
                                    return (
                                        <button
                                            key={String(f.id)}
                                            type="button"
                                            className="admFaq__card"
                                            onClick={() => abrirDetalhe(Number(f.id))}
                                        >
                                            <div className="admFaq__cardTop">
                                                <div className="admFaq__cardTitle">
                                                    <span className="admFaq__icon">
                                                        <HelpCircle size={18} />
                                                    </span>
                                                    <div className="admFaq__titleTxt">
                                                        <div className="admFaq__titulo" title={f.titulo}>
                                                            {f.titulo}
                                                        </div>
                                                        <div className="admFaq__meta">
                                                            <span className="admFaq__categoria">
                                                                <Tag size={14} /> {f.categoria || "GERAL"}
                                                            </span>
                                                            {f.ordem !== undefined ? <span className="admFaq__ordem">Ordem: {f.ordem}</span> : null}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={`admFaq__status ${ativo ? "ativo" : "inativo"}`}>
                                                    {ativo ? <BadgeCheck size={16} /> : <BadgeX size={16} />}
                                                    {ativo ? "ATIVO" : "INATIVO"}
                                                </div>
                                            </div>

                                            <div className="admFaq__desc">
                                                {String(f.descricao || "").slice(0, 160)}
                                                {String(f.descricao || "").length > 160 ? "..." : ""}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                ) : null}

                {/* FAB + */}
                <button
                    type="button"
                    className="admFaq__fab"
                    aria-label="Adicionar item do FAQ"
                    onClick={() => setModalNovo(true)}
                >
                    <Plus size={20} />
                </button>
            </main>

            {/* Modal filtros */}
            <Modal aberto={modalFiltros} titulo="Filtros" aoFechar={() => setModalFiltros(false)}>
                <div className="admFaq__modalGrid">
                    <label className="admFaq__campo">
                        <span>Categoria</span>
                        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                            <option value="TODAS">Todas</option>
                            {categorias.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="admFaq__campo">
                        <span>Status</span>
                        <select value={filtroAtivo} onChange={(e) => setFiltroAtivo(e.target.value as any)}>
                            <option value="TODOS">Todos</option>
                            <option value="ATIVO">Ativos</option>
                            <option value="INATIVO">Inativos</option>
                        </select>
                    </label>

                    <label className="admFaq__campo">
                        <span>Ordenação</span>
                        <select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value as any)}>
                            <option value="ORDEM_ASC">Ordem (crescente)</option>
                            <option value="TITULO_ASC">Título (A-Z)</option>
                            <option value="CATEGORIA_ASC">Categoria (A-Z)</option>
                        </select>
                    </label>

                    <div className="admFaq__modalAcoes">
                        <button type="button" onClick={() => setModalFiltros(false)}>
                            Aplicar
                        </button>
                        <button
                            type="button"
                            className="admFaq__ghost"
                            onClick={() => {
                                setFiltroCategoria("TODAS");
                                setFiltroAtivo("TODOS");
                                setOrdenacao("ORDEM_ASC");
                                setModalFiltros(false);
                            }}
                        >
                            Limpar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal novo */}
            <Modal aberto={modalNovo} titulo="Novo item do FAQ" aoFechar={() => setModalNovo(false)}>
                <div className="admFaq__modalGrid">
                    <label className="admFaq__campo">
                        <span>Título</span>
                        <input value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} placeholder="Ex: Como solicitar férias?" />
                    </label>

                    <label className="admFaq__campo">
                        <span>Categoria</span>
                        <input value={novoCategoria} onChange={(e) => setNovoCategoria(e.target.value)} placeholder="Ex: FÉRIAS" />
                    </label>

                    <label className="admFaq__campo">
                        <span>Descrição</span>
                        <textarea value={novoDescricao} onChange={(e) => setNovoDescricao(e.target.value)} rows={8} placeholder="Resposta/Orientação" />
                    </label>

                    <div className="admFaq__linha2">
                        <label className="admFaq__campo">
                            <span>Ordem (opcional)</span>
                            <input value={novoOrdem} onChange={(e) => setNovoOrdem(e.target.value)} placeholder="Ex: 10" />
                        </label>

                        <label className="admFaq__check">
                            <input type="checkbox" checked={novoAtivo} onChange={(e) => setNovoAtivo(e.target.checked)} />
                            <span>Ativo</span>
                        </label>
                    </div>

                    <div className="admFaq__modalAcoes">
                        <button type="button" onClick={criarNovo} disabled={processando}>
                            <Save size={16} /> {processando ? "Criando..." : "Criar"}
                        </button>
                        <button type="button" className="admFaq__ghost" onClick={() => setModalNovo(false)} disabled={processando}>
                            Cancelar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal detalhe */}
            <Modal
                aberto={Boolean(modalDetalhe)}
                titulo={modalDetalhe ? `FAQ: #${modalDetalhe.id}` : "FAQ"}
                aoFechar={() => setModalDetalhe(null)}
            >
                {detalheCarregando ? (
                    <div>Carregando...</div>
                ) : detalhe ? (
                    <div className="admFaq__detalheGrid">
                        <div className="admFaq__detalheBloco">
                            <div className="admFaq__detalheTitulo">Dados</div>

                            <label className="admFaq__campo">
                                <span>ID</span>
                                <input value={String(modalDetalhe?.id || "")} readOnly />
                            </label>

                            <label className="admFaq__campo">
                                <span>Título</span>
                                <input value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)} />
                            </label>

                            <label className="admFaq__campo">
                                <span>Categoria</span>
                                <input value={editCategoria} onChange={(e) => setEditCategoria(e.target.value)} />
                            </label>

                            <label className="admFaq__campo">
                                <span>Descrição</span>
                                <textarea value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} rows={8} />
                            </label>

                            <div className="admFaq__linha2">
                                <label className="admFaq__campo">
                                    <span>Ordem (opcional)</span>
                                    <input value={editOrdem} onChange={(e) => setEditOrdem(e.target.value)} />
                                </label>

                                <label className="admFaq__check">
                                    <input type="checkbox" checked={editAtivo} onChange={(e) => setEditAtivo(e.target.checked)} />
                                    <span>Ativo</span>
                                </label>
                            </div>

                            <button type="button" className="admFaq__btnSalvar" onClick={salvarAlteracoes} disabled={!alterou || processando}>
                                <Save size={16} /> {processando ? "Salvando..." : "Salvar alterações"}
                            </button>
                        </div>

                        <div className="admFaq__detalheBloco admFaq__danger">
                            <div className="admFaq__detalheTitulo">Excluir</div>
                            <div className="admFaq__dangerHint">
                                Para excluir, digite exatamente: <strong>EXCLUIR {modalDetalhe?.id}</strong>
                            </div>

                            <input
                                value={confirmExclusao}
                                onChange={(e) => setConfirmExclusao(e.target.value)}
                                placeholder={`EXCLUIR ${modalDetalhe?.id}`}
                            />

                            <button type="button" className="admFaq__btnDanger" onClick={excluirItemFaq} disabled={processando}>
                                <Trash2 size={16} /> Excluir item do FAQ
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
