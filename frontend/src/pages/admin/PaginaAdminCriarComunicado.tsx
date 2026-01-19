import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Paperclip,
    Upload,
    Trash2,
    Image as IconImage,
    FileText,
    ShieldAlert
} from "lucide-react";

import { BarraTopo } from "../../components/BarraTopo/BarraTopo";
import { useSessaoAuth } from "../../hooks/useSessaoAuth";
import { ErroHttp } from "../../api/clienteHttp";
import { uploadAnexoAdmin, type UploadResponse } from "../../api/uploads.api";
import {
    criarComunicadoAdmin,
    atualizarComunicadoAdmin,
    obterComunicadoAdmin,
    type ComunicadoAdminPayload
} from "../../api/comunicados.api";

import "../../pages/PaginaBase.css";
import "./PaginaAdminCriarComunicado.css";

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

type TipoAnexo = "IMAGEM" | "DOCUMENTO" | "NENHUM";

function normalizarTipoAnexo(v: any): TipoAnexo {
    const t = String(v || "").toUpperCase();
    if (t === "IMAGEM" || t === "DOCUMENTO" || t === "NENHUM") return t as TipoAnexo;
    return "NENHUM";
}

function inferTipo(file: File | null): TipoAnexo {
    if (!file) return "NENHUM";
    if (file.type.startsWith("image/")) return "IMAGEM";
    if (file.type === "application/pdf") return "DOCUMENTO";
    return "NENHUM";
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

    // anexo
    const [file, setFile] = useState<File | null>(null);
    const [anexo, setAnexo] = useState<{ url: string; tipo: TipoAnexo; mime?: string } | null>(null);
    const [uploading, setUploading] = useState(false);

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
                const data: any = await obterComunicadoAdmin({ token: sessao.token, id: comunicadoId }, ac.signal);

                setTitulo(String(data?.titulo || ""));
                setDescricao(String(data?.descricao || ""));
                setImportancia(data?.importancia || "RELEVANTE");
                setFixadoTopo(Boolean(data?.fixado_topo));
                setExpiraEm(String(data?.expira_em || hojeMaisDias(7)));

                const anexo_url = data?.anexo_url ? String(data.anexo_url) : "";
                const anexo_tipo = normalizarTipoAnexo(data?.anexo_tipo);

                if (anexo_url && anexo_tipo !== "NENHUM") {
                    setAnexo({ url: anexo_url, tipo: anexo_tipo });
                } else {
                    setAnexo(null);
                }
            } catch (e: any) {
                if (isAbortError(e)) return;
                const msg = e instanceof ErroHttp ? e.message : e?.message;
                setErro(msg || "Não foi possível carregar o comunicado para edição.");
            } finally {
                setCarregando(false);
            }
        })();

        return () => ac.abort();
    }, [estaLogadoAdmin, sessao?.token, comunicadoId, navigate]);

    const payloadBase = useMemo((): Omit<ComunicadoAdminPayload, "status"> => {
        return {
            titulo: titulo.trim(),
            descricao: descricao.trim(),
            importancia,
            fixado_topo: fixadoTopo,
            expira_em: expiraEm.trim(),
            anexo_url: anexo?.url || undefined,
            anexo_tipo: anexo?.tipo && anexo.tipo !== "NENHUM" ? anexo.tipo : "NENHUM"
        };
    }, [titulo, descricao, importancia, fixadoTopo, expiraEm, anexo]);

    async function enviarAnexo() {
        if (!sessao?.token) return;

        if (!file) {
            setErro("Selecione um arquivo para anexar (imagem ou PDF).");
            return;
        }

        const tipoInferido = inferTipo(file);
        if (tipoInferido === "NENHUM") {
            setErro("Tipo de arquivo inválido. Use PNG/JPG/WEBP ou PDF.");
            return;
        }

        setUploading(true);
        setErro(null);

        try {
            const resp: UploadResponse = await uploadAnexoAdmin({ token: sessao.token, file });
            const tipoResp = normalizarTipoAnexo((resp as any)?.type);

            if (!resp?.url || tipoResp === "NENHUM") {
                setErro("Upload não retornou URL válida.");
                return;
            }

            setAnexo({ url: resp.url, tipo: tipoResp, mime: resp.mime });
            setFile(null);
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            setErro(msg || "Não foi possível enviar o anexo.");
        } finally {
            setUploading(false);
        }
    }

    function removerAnexo() {
        setAnexo(null);
        setFile(null);
    }

    async function salvar(status: "RASCUNHO" | "PUBLICADO") {
        if (!sessao?.token) return;

        const body: ComunicadoAdminPayload = { ...payloadBase, status };

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

                {erro ? (
                    <div className="admCriar__alert card cardErro">
                        <ShieldAlert size={18} />
                        <div>{erro}</div>
                    </div>
                ) : null}

                <section className="admCriar__grid">
                    <div className="card admCriar__form">
                        <label className="admCriar__campo">
                            <span>Título</span>
                            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do comunicado" />
                        </label>

                        <label className="admCriar__campo">
                            <span>Descrição</span>
                            <textarea
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                placeholder="Conteúdo do comunicado"
                                rows={10}
                            />
                        </label>

                        <div className="admCriar__linha2">
                            <label className="admCriar__campo">
                                <span>Importância</span>
                                <select value={importancia} onChange={(e) => setImportancia(e.target.value as any)}>
                                    <option value="IMPORTANTE">IMPORTANTE</option>
                                    <option value="RELEVANTE">RELEVANTE</option>
                                    <option value="POUCO_RELEVANTE">POUCO_RELEVANTE</option>
                                </select>
                            </label>

                            <label className="admCriar__campo">
                                <span>Expira em (dd/mm/aaaa)</span>
                                <input value={expiraEm} onChange={(e) => setExpiraEm(e.target.value)} placeholder="dd/mm/aaaa" />
                            </label>
                        </div>

                        <label className="admCriar__check">
                            <input type="checkbox" checked={fixadoTopo} onChange={(e) => setFixadoTopo(e.target.checked)} />
                            <span>Fixar no topo</span>
                        </label>
                    </div>

                    <aside className="card admCriar__anexo">
                        <div className="admCriar__anexoTopo">
                            <div className="admCriar__anexoTitulo">
                                <Paperclip size={18} /> Anexo (opcional)
                            </div>
                            <div className="admCriar__anexoSub">Envie uma imagem (PNG/JPG/WEBP) ou PDF.</div>
                        </div>

                        {!anexo ? (
                            <>
                                <label className="admCriar__file">
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,application/pdf"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    />
                                    <div className="admCriar__fileBox">
                                        <Upload size={18} />
                                        <div>
                                            <div className="admCriar__fileTxt">Selecionar arquivo</div>
                                            <div className="admCriar__fileHint">Até 5MB (backend). PDF ou imagem.</div>
                                        </div>
                                    </div>
                                </label>

                                {file ? (
                                    <div className="admCriar__filePreview">
                                        <div className="admCriar__fileName">{file.name}</div>
                                        <div className="admCriar__fileMeta">
                                            {inferTipo(file)} • {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </div>
                                    </div>
                                ) : null}

                                <button
                                    type="button"
                                    className="admCriar__btnAnexo"
                                    onClick={enviarAnexo}
                                    disabled={uploading || !file}
                                >
                                    {uploading ? "Enviando..." : "Enviar anexo"}
                                </button>
                            </>
                        ) : (
                            <div className="admCriar__anexoOk">
                                <div className="admCriar__anexoBadge">
                                    {anexo.tipo === "IMAGEM" ? <IconImage size={16} /> : <FileText size={16} />}
                                    <span>{anexo.tipo}</span>
                                </div>

                                <div className="admCriar__anexoUrl">{anexo.url}</div>

                                {anexo.tipo === "IMAGEM" ? (
                                    <div className="admCriar__imgWrap">
                                        <img src={anexo.url} alt="Preview do anexo" loading="lazy" />
                                    </div>
                                ) : (
                                    <a className="admCriar__linkPdf" href={anexo.url} target="_blank" rel="noreferrer">
                                        Abrir PDF em nova aba
                                    </a>
                                )}

                                <button type="button" className="admCriar__btnRemover" onClick={removerAnexo}>
                                    <Trash2 size={16} /> Remover anexo
                                </button>
                            </div>
                        )}
                    </aside>
                </section>

                <section className="card admCriar__acoes">
                    <button type="button" className="admCriar__btnPrimario" disabled={carregando} onClick={() => salvar("PUBLICADO")}>
                        Publicar
                    </button>
                    <button type="button" className="admCriar__btnSec" disabled={carregando} onClick={() => salvar("RASCUNHO")}>
                        Salvar em rascunho
                    </button>
                    <button type="button" className="admCriar__btnGhost" disabled={carregando} onClick={() => navigate("/admin", { replace: true })}>
                        Cancelar
                    </button>

                    {carregando ? <div className="admCriar__status">Processando...</div> : null}
                </section>
            </main>
        </div>
    );
}
