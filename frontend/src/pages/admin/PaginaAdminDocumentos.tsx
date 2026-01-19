import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MoreVertical, Folder, FileText, ChevronDown, ChevronRight, Plus, Upload } from "lucide-react";

import { BarraTopo } from "../../components/BarraTopo/BarraTopo";
import { Modal } from "../../components/Modal/Modal";
import { useSessaoAuth } from "../../hooks/useSessaoAuth";
import {
    NoBiblioteca,
    obterArvoreBiblioteca,
    criarPastaAdmin,
    atualizarPastaAdmin,
    excluirPastaAdmin,
    adicionarDocumentoAdmin,
    excluirDocumentoAdmin
} from "../../api/biblioteca.api";

import { ErroHttp } from "../../api/clienteHttp";
import "./PaginaAdminDocumentos.css";

function isAbortError(e: any) {
    return e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("abort");
}

type MenuCtx =
    | { tipo: "PASTA"; id: number; nome: string }
    | { tipo: "DOCUMENTO"; id: number; nome: string };

function NoArvoreAdmin({
    no,
    abertos,
    alternar,
    onMenu
}: {
    no: NoBiblioteca;
    abertos: Set<string>;
    alternar: (id: string) => void;
    onMenu: (ctx: MenuCtx, el: HTMLButtonElement) => void;
}) {
    const id = String(no.id);
    const aberto = abertos.has(id);

    if (no.tipo === "DOCUMENTO") {
        return (
            <div className="admDocs__linha">
                <div className="admDocs__linhaEsq">
                    <FileText size={16} />
                    <span className="admDocs__nome">{no.nome}</span>
                </div>

                <button
                    type="button"
                    className="admDocs__menuBtn"
                    aria-label="Ações do documento"
                    onClick={(e) => onMenu({ tipo: "DOCUMENTO", id: Number(no.id), nome: no.nome }, e.currentTarget)}
                >
                    <MoreVertical size={18} />
                </button>
            </div>
        );
    }

    return (
        <div className="admDocs__pasta">
            <div className="admDocs__linha">
                <button className="admDocs__toggle" type="button" onClick={() => alternar(id)} aria-label="Expandir pasta">
                    {aberto ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>

                <div className="admDocs__linhaEsq">
                    <Folder size={16} />
                    <span className="admDocs__nome">{no.nome}</span>
                </div>

                <button
                    type="button"
                    className="admDocs__menuBtn"
                    aria-label="Ações da pasta"
                    onClick={(e) => onMenu({ tipo: "PASTA", id: Number(no.id), nome: no.nome }, e.currentTarget)}
                >
                    <MoreVertical size={18} />
                </button>
            </div>

            {aberto && no.filhos?.length ? (
                <div className="admDocs__filhos">
                    {no.filhos.map((f) => (
                        <NoArvoreAdmin key={String(f.id)} no={f} abertos={abertos} alternar={alternar} onMenu={onMenu} />
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

    // menu flutuante (3 pontos)
    const [menuAberto, setMenuAberto] = useState<{ ctx: MenuCtx; x: number; y: number } | null>(null);

    // modais
    const [modalNovaPasta, setModalNovaPasta] = useState(false);
    const [modalEditarPasta, setModalEditarPasta] = useState<{ id: number; nome: string } | null>(null);
    const [modalUpload, setModalUpload] = useState<{ pastaId: number; pastaNome: string } | null>(null);

    const [nomePasta, setNomePasta] = useState("");
    const [uploadNomeDoc, setUploadNomeDoc] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    const acRef = useRef<AbortController | null>(null);

    const estaLogado = Boolean(sessao?.token);
    const role = sessao?.role;

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
                const data = await obterArvoreBiblioteca(ac.signal);
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
    }, [estaLogadoAdmin, sessao?.token]);

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
        setMenuAberto({ ctx, x: Math.round(r.right), y: Math.round(r.bottom) });
    }

    async function recarregar() {
        if (!sessao?.token) return;
        setEstado("carregando");
        setErro(null);
        try {
            const data = await obterArvoreBiblioteca();
            setArvore(data);
            setEstado("pronto");
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            setErro(msg || "Não foi possível carregar a biblioteca.");
            setEstado("erro");
        }
    }

    async function confirmarExcluirDocumento(docId: number) {
        if (!sessao?.token) return;
        const ok = window.confirm("Excluir este documento definitivamente?");
        if (!ok) return;

        try {
            await excluirDocumentoAdmin({ token: sessao.token, docId });
            await recarregar();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível excluir o documento.");
        } finally {
            fecharMenu();
        }
    }

    async function confirmarExcluirPasta(pastaId: number) {
        if (!sessao?.token) return;
        const ok = window.confirm("Excluir esta pasta? (Somente funciona se o backend permitir e a pasta estiver vazia.)");
        if (!ok) return;

        try {
            await excluirPastaAdmin({ token: sessao.token, pastaId });
            await recarregar();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível excluir a pasta.");
        } finally {
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

        try {
            await criarPastaAdmin({ token: sessao.token, nome });
            setModalNovaPasta(false);
            setNomePasta("");
            await recarregar();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível criar a pasta.");
        }
    }

    async function salvarEdicaoPasta() {
        if (!sessao?.token || !modalEditarPasta) return;
        const nome = nomePasta.trim();
        if (nome.length < 3) {
            alert("Informe um nome de pasta válido (mínimo 3 caracteres).");
            return;
        }

        try {
            await atualizarPastaAdmin({ token: sessao.token, pastaId: modalEditarPasta.id, nome });
            setModalEditarPasta(null);
            setNomePasta("");
            await recarregar();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível editar a pasta.");
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

        try {
            await adicionarDocumentoAdmin({
                token: sessao.token,
                pastaId: modalUpload.pastaId,
                nome,
                file: uploadFile
            });
            setModalUpload(null);
            setUploadNomeDoc("");
            setUploadFile(null);
            await recarregar();
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível enviar o documento.");
        }
    }

    const vazio = useMemo(() => estado === "pronto" && arvore.length === 0, [estado, arvore]);

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
                    <h1 className="paginaBase__titulo">Admin — Documentos</h1>
                </div>

                <section className="admDocs__acoes card">
                    <button type="button" className="admDocs__acaoBtn" onClick={() => setModalNovaPasta(true)}>
                        <Plus size={18} /> Nova pasta
                    </button>

                    <button
                        type="button"
                        className="admDocs__acaoBtn"
                        onClick={() => alert("Para enviar documento, abra o menu (3 pontos) de uma pasta e escolha Upload.")}
                    >
                        <Upload size={18} /> Upload (via pasta)
                    </button>

                    <button type="button" className="admDocs__acaoBtn" onClick={recarregar}>
                        Recarregar
                    </button>
                </section>

                {estado === "carregando" ? <div className="card">Carregando...</div> : null}
                {estado === "erro" ? <div className="card cardErro">{erro}</div> : null}
                {vazio ? <div className="card">Nenhuma pasta/documento cadastrado.</div> : null}

                {estado === "pronto" && arvore.length > 0 ? (
                    <section className="admDocs__arvore card">
                        {arvore.map((n) => (
                            <NoArvoreAdmin key={String(n.id)} no={n} abertos={abertos} alternar={alternar} onMenu={abrirMenu} />
                        ))}
                    </section>
                ) : null}

                {/* menu flutuante */}
                {menuAberto ? (
                    <div
                        className="admDocs__menu"
                        style={{ top: menuAberto.y + 6, left: Math.max(12, menuAberto.x - 190) }}
                        role="menu"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {menuAberto.ctx.tipo === "DOCUMENTO" ? (
                            <>
                                <button type="button" className="admDocs__menuItem" onClick={() => confirmarExcluirDocumento(menuAberto.ctx.id)}>
                                    Excluir documento
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="admDocs__menuItem"
                                    onClick={() => {
                                        setModalEditarPasta({ id: menuAberto.ctx.id, nome: menuAberto.ctx.nome });
                                        setNomePasta(menuAberto.ctx.nome);
                                        fecharMenu();
                                    }}
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
                                >
                                    Upload de documento (PDF)
                                </button>

                                <button type="button" className="admDocs__menuItem admDocs__menuItemDanger" onClick={() => confirmarExcluirPasta(menuAberto.ctx.id)}>
                                    Excluir pasta
                                </button>
                            </>
                        )}
                    </div>
                ) : null}
            </main>

            {/* Modal Nova Pasta */}
            <Modal aberto={modalNovaPasta} titulo="Nova pasta" aoFechar={() => setModalNovaPasta(false)}>
                <div style={{ display: "grid", gap: 10 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 900 }}>Nome da pasta</span>
                        <input value={nomePasta} onChange={(e) => setNomePasta(e.target.value)} placeholder="Ex: BENEFÍCIOS" />
                    </label>

                    <div style={{ display: "flex", gap: 10 }}>
                        <button type="button" onClick={criarPasta}>Criar</button>
                        <button type="button" onClick={() => setModalNovaPasta(false)}>Cancelar</button>
                    </div>
                </div>
            </Modal>

            {/* Modal Editar Pasta */}
            <Modal
                aberto={Boolean(modalEditarPasta)}
                titulo="Editar pasta"
                aoFechar={() => setModalEditarPasta(null)}
            >
                <div style={{ display: "grid", gap: 10 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 900 }}>Nome da pasta</span>
                        <input value={nomePasta} onChange={(e) => setNomePasta(e.target.value)} />
                    </label>

                    <div style={{ display: "flex", gap: 10 }}>
                        <button type="button" onClick={salvarEdicaoPasta}>Salvar</button>
                        <button type="button" onClick={() => setModalEditarPasta(null)}>Cancelar</button>
                    </div>
                </div>
            </Modal>

            {/* Modal Upload */}
            <Modal
                aberto={Boolean(modalUpload)}
                titulo={modalUpload ? `Upload em: ${modalUpload.pastaNome}` : "Upload"}
                aoFechar={() => setModalUpload(null)}
            >
                <div style={{ display: "grid", gap: 10 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 900 }}>Nome do documento</span>
                        <input value={uploadNomeDoc} onChange={(e) => setUploadNomeDoc(e.target.value)} placeholder="Ex: POLÍTICA DE FÉRIAS" />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontWeight: 900 }}>Arquivo (PDF)</span>
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        />
                    </label>

                    <div style={{ display: "flex", gap: 10 }}>
                        <button type="button" onClick={enviarDocumento}>Enviar</button>
                        <button type="button" onClick={() => setModalUpload(null)}>Cancelar</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
