import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    MoreVertical,
    Folder,
    FileText,
    ChevronDown,
    ChevronRight,
    Plus,
    Upload,
    RefreshCcw,
    Search,
    ShieldAlert,
    X,
} from "lucide-react";

import { BarraTopo } from "../../components/BarraTopo/BarraTopo";
import { Modal } from "../../components/Modal/Modal";
import { useSessaoAuth } from "../../hooks/useSessaoAuth";
import {
    NoBiblioteca,
    obterArvoreBibliotecaAdmin,
    criarPastaAdmin,
    atualizarPastaAdmin,
    excluirPastaAdmin,
    adicionarDocumentoAdmin,
    excluirDocumentoAdmin,
} from "../../api/biblioteca.api";
import { listarColaboradoresAdmin, type ColaboradorAdmin } from "../../api/colaborador.api";

import { ErroHttp } from "../../api/clienteHttp";
import "../../pages/PaginaBase.css";
import "./PaginaAdminDocumentos.css";

function isAbortError(e: any) {
    return e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("abort");
}

type MenuCtx =
    | { tipo: "PASTA"; id: number; nome: string; is_private?: boolean }
    | { tipo: "DOCUMENTO"; id: number; nome: string };

function contarItens(arvore: NoBiblioteca[]) {
    let pastas = 0;
    let documentos = 0;

    const walk = (n: NoBiblioteca) => {
        if (n.tipo === "PASTA") {
            pastas += 1;
            (n.filhos || []).forEach(walk);
        } else {
            documentos += 1;
        }
    };

    arvore.forEach(walk);
    return { pastas, documentos };
}

function NoArvoreAdmin({
    no,
    depth = 0,
    abertos,
    alternar,
    onMenu,
}: {
    no: NoBiblioteca;
    depth?: number;
    abertos: Set<string>;
    alternar: (id: string) => void;
    onMenu: (ctx: MenuCtx, el: HTMLButtonElement) => void;
}) {
    const id = String(no.id);
    const aberto = abertos.has(id);

    if (no.tipo === "DOCUMENTO") {
        return (
            <div
                className="admDocs__docItem"
                style={{ marginLeft: `${depth * 20}px` }}
                role="row"
            >
                <FileText size={16} />
                <span className="admDocs__docName">{no.nome}</span>
                <button
                    type="button"
                    className="admDocs__actionBtn"
                    aria-label="Ações do documento"
                    onClick={(e) => onMenu({ tipo: "DOCUMENTO", id: Number(no.id), nome: no.nome }, e.currentTarget)}
                >
                    <MoreVertical size={18} />
                </button>
            </div>
        );
    }

    return (
        <div className="admDocs__pastaBlock" role="rowgroup">
            <button
                className="admDocs__folderBtn"
                style={{ marginLeft: `${depth * 20}px` }}
                type="button"
                onClick={() => alternar(id)}
            >
                {aberto ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                <Folder size={16} />
                <span className="admDocs__folderName">{no.nome}</span>
                {no.is_private ? <span className="admDocs__privateBadge">PRIVADA</span> : null}
                <button
                    type="button"
                    className="admDocs__actionBtn"
                    aria-label="Ações da pasta"
                    onClick={(e) => {
                        e.stopPropagation();
                        onMenu({ tipo: "PASTA", id: Number(no.id), nome: no.nome, is_private: (no as any).is_private }, e.currentTarget);
                    }}
                >
                    <MoreVertical size={18} />
                </button>
            </button>

            {aberto && Array.isArray(no.filhos) && no.filhos.length > 0 ? (
                <div className="admDocs__folderChildren">
                    {no.filhos.map((f) => (
                        <NoArvoreAdmin
                            key={String(f.id)}
                            no={f}
                            depth={depth + 1}
                            abertos={abertos}
                            alternar={alternar}
                            onMenu={onMenu}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export function PaginaAdminDocumentos() {
    const navigate = useNavigate();
    const { sessao, estaLogadoAdmin, sair } = useSessaoAuth();

    const [estado, setEstado] = useState<"carregando" | "erro" | "pronto">("carregando");
    const [erro, setErro] = useState<string | null>(null);

    const [arvore, setArvore] = useState<NoBiblioteca[]>([]);
    const [abertos, setAbertos] = useState<Set<string>>(() => new Set());

    const [busca, setBusca] = useState("");

    // menu flutuante (3 pontos)
    const [menuAberto, setMenuAberto] = useState<{ ctx: MenuCtx; x: number; y: number } | null>(null);

    // modais
    const [modalNovaPasta, setModalNovaPasta] = useState(false);
    const [modalEditarPasta, setModalEditarPasta] = useState<{ id: number; nome: string; is_private?: boolean } | null>(null);
    const [modalUpload, setModalUpload] = useState<{ pastaId: number; pastaNome: string } | null>(null);

    const [nomePasta, setNomePasta] = useState("");
    const [novaPastaPrivada, setNovaPastaPrivada] = useState(false);

    const [uploadNomeDoc, setUploadNomeDoc] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    // destinatário específico (só admins nivel >1)
    const [destSearch, setDestSearch] = useState("");
    const [destResults, setDestResults] = useState<ColaboradorAdmin[]>([]);
    const [destSelecionado, setDestSelecionado] = useState<ColaboradorAdmin | null>(null);
    const [destLoading, setDestLoading] = useState(false);

    const [processando, setProcessando] = useState(false);

    const acRef = useRef<AbortController | null>(null);

    const canAssignDest = Boolean(sessao?.user?.nivel > 1);

    // fetch collaborators for autocomplete when search string changes
    useEffect(() => {
        const q = destSearch.trim();
        if (!q || !sessao?.token) {
            setDestResults([]);
            setDestLoading(false);
            return;
        }

        const ac = new AbortController();
        setDestLoading(true);
        listarColaboradoresAdmin({ token: sessao.token, page: 1, pageSize: 10, search: q }, ac.signal)
            .then((r) => {
                if (!ac.signal.aborted) setDestResults(r.items);
            })
            .catch(() => { })
            .finally(() => {
                if (!ac.signal.aborted) setDestLoading(false);
            });

        return () => ac.abort();
    }, [destSearch, sessao?.token]);

    function fecharMenu() {
        setMenuAberto(null);
    }

    useEffect(() => {
        if (!estaLogadoAdmin || !sessao?.token) {
            navigate("/", { replace: true });
            return;
        }

        acRef.current?.abort();
        const ac = new AbortController();
        acRef.current = ac;

        (async () => {
            setEstado("carregando");
            setErro(null);
            try {
                if (!sessao?.token) throw new Error("Sem token");
                const data = await obterArvoreBibliotecaAdmin({ token: sessao.token }, ac.signal);
                setArvore(data);
                setEstado("pronto");
            } catch (e: any) {
                if (isAbortError(e)) return;
                const msg = e instanceof ErroHttp ? e.message : e?.message;
                setErro(msg || "Não foi possível carregar a biblioteca.");
                setEstado("erro");
            }
        })();

        return () => ac.abort();
    }, [estaLogadoAdmin, sessao?.token, navigate]);

    useEffect(() => {
        const onDown = () => fecharMenu();
        window.addEventListener("scroll", onDown, true);
        window.addEventListener("mousedown", onDown);
        return () => {
            window.removeEventListener("scroll", onDown, true);
            window.removeEventListener("mousedown", onDown);
        };
    }, []);

    const alternar = (id: string) => {
        setAbertos((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    };

    function abrirMenu(ctx: MenuCtx, el: HTMLButtonElement) {
        const r = el.getBoundingClientRect();
        // posiciona abaixo e alinhado à direita do botão
        setMenuAberto({ ctx, x: Math.round(r.right), y: Math.round(r.bottom) });
    }

    async function recarregar(signal?: AbortSignal) {
        setEstado("carregando");
        setErro(null);
        try {
            if (!sessao?.token) throw new Error("Sem token");
            const data = await obterArvoreBibliotecaAdmin({ token: sessao.token }, signal);
            setArvore(data);
            setEstado("pronto");
        } catch (e: any) {
            if (isAbortError(e)) return;
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            setErro(msg || "Não foi possível carregar a biblioteca.");
            setEstado("erro");
        }
    }

    async function confirmarExcluirDocumento(docId: number) {
        if (!sessao?.token) return;
        const ok = window.confirm("Excluir este documento definitivamente?");
        if (!ok) return;

        setProcessando(true);
        try {
            await excluirDocumentoAdmin({ token: sessao.token, docId });
            await recarregar();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível excluir o documento.");
        } finally {
            setProcessando(false);
            fecharMenu();
        }
    }

    async function confirmarExcluirPasta(pastaId: number) {
        if (!sessao?.token) return;
        const ok = window.confirm("Excluir esta pasta? (A pasta precisa estar vazia, conforme regra do backend.)");
        if (!ok) return;

        setProcessando(true);
        try {
            await excluirPastaAdmin({ token: sessao.token, pastaId });
            await recarregar();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível excluir a pasta.");
        } finally {
            setProcessando(false);
            fecharMenu();
        }
    }

    async function criarPasta() {
        if (!sessao?.token) return;
        const nome = nomePasta.trim();
        if (nome.length < 3) {
            alert("Informe um nome de pasta válido (mínimo 3 caracteres).");
            return;
        }

        setProcessando(true);
        try {
            await criarPastaAdmin({ token: sessao.token, nome, isPrivate: novaPastaPrivada });
            setModalNovaPasta(false);
            setNomePasta("");
            setNovaPastaPrivada(false);
            await recarregar();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível criar a pasta.");
        } finally {
            setProcessando(false);
        }
    }

    async function salvarEdicaoPasta() {
        if (!sessao?.token || !modalEditarPasta) return;
        const nome = nomePasta.trim();
        if (nome.length < 3) {
            alert("Informe um nome de pasta válido (mínimo 3 caracteres).");
            return;
        }

        setProcessando(true);
        try {
            await atualizarPastaAdmin({
                token: sessao.token,
                pastaId: modalEditarPasta.id,
                nome,
                isPrivate: novaPastaPrivada
            });
            setModalEditarPasta(null);
            setNomePasta("");
            await recarregar();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível editar a pasta.");
        } finally {
            setProcessando(false);
        }
    }

    async function enviarDocumento() {
        if (!sessao?.token || !modalUpload) return;
        const nome = uploadNomeDoc.trim();
        if (nome.length < 3) {
            alert("Informe um nome de documento válido (mínimo 3 caracteres).");
            return;
        }
        if (!uploadFile) {
            alert("Selecione um arquivo PDF.");
            return;
        }

        setProcessando(true);
        try {
            await adicionarDocumentoAdmin({
                token: sessao.token,
                pastaId: modalUpload.pastaId,
                nome,
                file: uploadFile,
                destinatarioMatricula: destSelecionado?.matricula,
            });
            setModalUpload(null);
            setUploadNomeDoc("");
            setUploadFile(null);
            setDestSearch("");
            setDestResults([]);
            setDestSelecionado(null);
            await recarregar();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível enviar o documento.");
        } finally {
            setProcessando(false);
        }
    }

    const vazio = useMemo(() => estado === "pronto" && arvore.length === 0, [estado, arvore]);

    const { pastas, documentos } = useMemo(() => contarItens(arvore), [arvore]);

    // filtro por busca (mantém árvore, mas remove itens sem match)
    const arvoreFiltrada = useMemo(() => {
        const q = busca.trim().toLowerCase();
        if (!q) return arvore;

        const filtrar = (n: NoBiblioteca): NoBiblioteca | null => {
            const nomeOk = String(n.nome || "").toLowerCase().includes(q);

            if (n.tipo === "DOCUMENTO") {
                return nomeOk ? n : null;
            }

            const filhos = (n.filhos || [])
                .map(filtrar)
                .filter(Boolean) as NoBiblioteca[];

            if (nomeOk || filhos.length) {
                return { ...n, filhos };
            }

            return null;
        };

        return arvore.map(filtrar).filter(Boolean) as NoBiblioteca[];
    }, [arvore, busca]);

    // ao buscar, auto-expande tudo para a pessoa ver resultado
    useEffect(() => {
        const q = busca.trim();
        if (!q) return;
        const all = new Set<string>();
        const walk = (n: NoBiblioteca) => {
            all.add(String(n.id));
            (n.filhos || []).forEach(walk);
        };
        arvoreFiltrada.forEach(walk);
        setAbertos(all);
    }, [busca, arvoreFiltrada]);

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

                    <div className="admDocs__header">
                        <h1 className="paginaBase__titulo">Admin — Documentos</h1>
                        <div className="admDocs__subtitulo">
                            Gerencie pastas e documentos da biblioteca. <span className="admDocs__dot">•</span>{" "}
                            <strong>{pastas}</strong> pastas <span className="admDocs__dot">•</span>{" "}
                            <strong>{documentos}</strong> documentos
                        </div>
                    </div>
                </div>

                <section className="admDocs__toolbar card">
                    <div className="admDocs__busca">
                        <Search size={16} />
                        <input
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            placeholder="Buscar por nome de pasta ou documento"
                            aria-label="Buscar documentos"
                        />
                        {busca ? (
                            <button type="button" className="admDocs__clear" onClick={() => setBusca("")} aria-label="Limpar busca">
                                <X size={16} />
                            </button>
                        ) : null}
                    </div>

                    <div className="admDocs__toolbarAcoes">
                        <button
                            type="button"
                            className="admDocs__btn"
                            onClick={() => {
                                setNomePasta("");
                                setNovaPastaPrivada(false);
                                setModalNovaPasta(true);
                            }}
                            disabled={processando}
                        >
                            <Plus size={18} /> Nova pasta
                        </button>

                        <button
                            type="button"
                            className="admDocs__btn admDocs__btnGhost"
                            onClick={() => {
                                acRef.current?.abort();
                                const ac = new AbortController();
                                acRef.current = ac;
                                recarregar(ac.signal);
                            }}
                            disabled={processando}
                        >
                            <RefreshCcw size={18} /> Recarregar
                        </button>
                    </div>
                </section>

                {estado === "carregando" ? <div className="card">Carregando...</div> : null}

                {estado === "erro" ? (
                    <div className="admDocs__alert card cardErro">
                        <ShieldAlert size={18} />
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 900, marginBottom: 4 }}>Não foi possível carregar</div>
                            <div style={{ opacity: 0.85 }}>{erro}</div>
                            <div style={{ marginTop: 10 }}>
                                <button type="button" onClick={() => recarregar()}>
                                    Tentar novamente
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {vazio ? (
                    <div className="admDocs__empty card">
                        <div className="admDocs__emptyTitle">Biblioteca vazia</div>
                        <div className="admDocs__emptySub">Crie uma pasta para começar a organizar seus documentos.</div>
                        <div style={{ marginTop: 10 }}>
                            <button type="button" onClick={() => { setNomePasta(""); setNovaPastaPrivada(false); setModalNovaPasta(true); }}>
                                <Plus size={18} /> Nova pasta
                            </button>
                        </div>
                    </div>
                ) : null}

                {estado === "pronto" && arvore.length > 0 ? (
                    <section className="admDocs__tree card">
                        <div className="admDocs__treeHeader">
                            <div className="admDocs__treeTitle">Estrutura</div>
                            <div className="admDocs__treeHint">
                                Use o menu de <strong>3 pontos</strong> para editar/excluir pastas ou enviar/excluir documentos.
                            </div>
                        </div>

                        <div className="admDocs__treeBody" role="table" aria-label="Biblioteca">
                            {(arvoreFiltrada || []).length ? (
                                arvoreFiltrada.map((n) => (
                                    <NoArvoreAdmin
                                        key={String(n.id)}
                                        no={n}
                                        depth={0}
                                        abertos={abertos}
                                        alternar={alternar}
                                        onMenu={abrirMenu}
                                    />
                                ))
                            ) : (
                                <div className="admDocs__noResults">
                                    Nenhum resultado para <strong>{busca.trim()}</strong>.
                                </div>
                            )}
                        </div>
                    </section>
                ) : null}

                {/* menu flutuante */}
                {menuAberto ? (
                    <div
                        className="admDocs__menu"
                        style={{ top: menuAberto.y + 8, left: Math.max(12, menuAberto.x - 220) }}
                        role="menu"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {menuAberto.ctx.tipo === "DOCUMENTO" ? (
                            <>
                                <div className="admDocs__menuTitle">Documento</div>
                                <div className="admDocs__menuSub">{menuAberto.ctx.nome}</div>

                                <button
                                    type="button"
                                    className="admDocs__menuItem admDocs__menuItemDanger"
                                    onClick={() => confirmarExcluirDocumento(menuAberto.ctx.id)}
                                    disabled={processando}
                                >
                                    Excluir documento
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="admDocs__menuTitle">Pasta</div>
                                <div className="admDocs__menuSub">{menuAberto.ctx.nome}</div>

                                <button
                                    type="button"
                                    className="admDocs__menuItem"
                                    onClick={() => {
                                        if (menuAberto.ctx.tipo === "PASTA") {
                                            setModalEditarPasta({ id: menuAberto.ctx.id, nome: menuAberto.ctx.nome, is_private: menuAberto.ctx.is_private });
                                            setNomePasta(menuAberto.ctx.nome);
                                            setNovaPastaPrivada(!!menuAberto.ctx.is_private);
                                        }
                                        fecharMenu();
                                    }}
                                    disabled={processando}
                                >
                                    Editar pasta
                                </button>

                                <button
                                    type="button"
                                    className="admDocs__menuItem"
                                    onClick={() => {
                                        setModalUpload({ pastaId: menuAberto.ctx.id, pastaNome: menuAberto.ctx.nome });
                                        setUploadNomeDoc("");
                                        setUploadFile(null);
                                        fecharMenu();
                                    }}
                                    disabled={processando}
                                >
                                    <Upload size={16} /> Upload de documento (PDF)
                                </button>

                                <button
                                    type="button"
                                    className="admDocs__menuItem admDocs__menuItemDanger"
                                    onClick={() => confirmarExcluirPasta(menuAberto.ctx.id)}
                                    disabled={processando}
                                >
                                    Excluir pasta
                                </button>
                            </>
                        )}
                    </div>
                ) : null}
            </main>

            {/* Modal Nova Pasta */}
            <Modal aberto={modalNovaPasta} titulo="Nova pasta" aoFechar={() => setModalNovaPasta(false)}>
                <div className="admDocs__modalGrid">
                    <label className="admDocs__campo">
                        <span>Nome da pasta</span>
                        <input value={nomePasta} onChange={(e) => setNomePasta(e.target.value)} placeholder="Ex: BENEFÍCIOS" />
                    </label>

                    <label className="admDocs__campo">
                        <span>Destino</span>
                        <select value={novaPastaPrivada ? "private" : "public"} onChange={(e) => setNovaPastaPrivada(e.target.value === "private")}>
                            <option value="public">Documentos públicos</option>
                            <option value="private">Meus documentos (privada)</option>
                        </select>
                    </label>

                    <div className="admDocs__modalAcoes">
                        <button type="button" onClick={criarPasta} disabled={processando}>
                            {processando ? "Criando..." : "Criar pasta"}
                        </button>
                        <button type="button" className="admDocs__ghost" onClick={() => setModalNovaPasta(false)} disabled={processando}>
                            Cancelar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Editar Pasta */}
            <Modal aberto={Boolean(modalEditarPasta)} titulo="Editar pasta" aoFechar={() => { setModalEditarPasta(null); setNovaPastaPrivada(false); }}>
                <div className="admDocs__modalGrid">
                    <label className="admDocs__campo">
                        <span>Novo nome</span>
                        <input value={nomePasta} onChange={(e) => setNomePasta(e.target.value)} placeholder="Nome da pasta" />
                    </label>

                    <label className="admDocs__campo">
                        <span>Destino</span>
                        <select value={novaPastaPrivada ? "private" : "public"} onChange={(e) => setNovaPastaPrivada(e.target.value === "private")}>
                            <option value="public">Documentos públicos</option>
                            <option value="private">Meus documentos (privada)</option>
                        </select>
                    </label>

                    <div className="admDocs__modalAcoes">
                        <button type="button" onClick={salvarEdicaoPasta} disabled={processando}>
                            {processando ? "Salvando..." : "Salvar"}
                        </button>
                        <button type="button" className="admDocs__ghost" onClick={() => { setModalEditarPasta(null); setNovaPastaPrivada(false); }} disabled={processando}>
                            Cancelar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Upload */}
            <Modal
                aberto={Boolean(modalUpload)}
                titulo={modalUpload ? `Upload em: ${modalUpload.pastaNome}` : "Upload"}
                aoFechar={() => setModalUpload(null)}
            >
                <div className="admDocs__modalGrid">
                    <div className="admDocs__uploadHint">
                        Selecione um PDF. O documento será exibido para todos os colaboradores na
                        biblioteca, a menos que você escolha um destinatário específico acima —
                        nesse caso apenas o colaborador selecionado poderá visualizá-lo.
                    </div>

                    <label className="admDocs__campo">
                        <span>Nome do documento</span>
                        <input
                            value={uploadNomeDoc}
                            onChange={(e) => setUploadNomeDoc(e.target.value)}
                            placeholder="Ex: POLÍTICA DE FÉRIAS"
                        />
                    </label>

                    <label className="admDocs__campo">
                        <span>Arquivo (PDF)</span>
                        <input type="file" accept="application/pdf" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                    </label>

                    {uploadFile ? (
                        <div className="admDocs__fileInfo">
                            <div className="admDocs__fileName">{uploadFile.name}</div>
                            <div className="admDocs__fileMeta">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB • application/pdf</div>
                        </div>
                    ) : null}

                    {/* destinatário opcional (only level>1 admins) */}
                    {canAssignDest ? (
                        <div className="admDocs__campo">
                            <span>Destinatário (opcional)</span>
                            <input
                                value={destSearch}
                                onChange={(e) => {
                                    setDestSearch(e.target.value);
                                    setDestSelecionado(null);
                                }}
                                placeholder="Nome ou matrícula"
                            />
                            {destLoading ? <div className="admDocs__destLoading">carregando...</div> : null}
                            {destResults.length > 0 && !destSelecionado ? (
                                <ul className="admDocs__destList">
                                    {destResults.map((c) => (
                                        <li key={c.matricula}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDestSelecionado(c);
                                                    setDestResults([]);
                                                }}
                                            >
                                                {c.nome_completo} ({c.matricula})
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                            {destSelecionado ? (
                                <div className="admDocs__destSelected">
                                    Selecionado: {destSelecionado.nome_completo} ({destSelecionado.matricula}){' '}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDestSelecionado(null);
                                            setDestSearch('');
                                        }}
                                    >
                                        limpar
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="admDocs__modalAcoes">
                        <button type="button" onClick={enviarDocumento} disabled={processando || !uploadFile}>
                            {processando ? "Enviando..." : "Enviar documento"}
                        </button>
                        <button type="button" className="admDocs__ghost" onClick={() => setModalUpload(null)} disabled={processando}>
                            Cancelar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
