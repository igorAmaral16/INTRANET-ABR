import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Paperclip,
    Trash2,
    Image as IconImage,
    FileText,
    ShieldAlert,
} from "lucide-react";

import { SidebarAdmin } from "../../components/SidebarAdmin/SidebarAdmin";
import { BotaoVoltar } from "../../components/BotaoVoltar/BotaoVoltar";
import { ImageUploadField } from "../../components/ImageUploadField/ImageUploadField";
import { useSessaoAuth } from "../../hooks/useSessaoAuth";
import { ErroHttp } from "../../api/clienteHttp";
import { validateImage } from "../../utils/imageValidation";
import { uploadAnexoAdmin, type UploadResponse } from "../../api/uploads.api";
import {
    criarComunicadoAdmin,
    atualizarComunicadoAdmin,
    obterComunicadoAdmin,
    type ComunicadoAdminPayload
} from "../../api/comunicados.api";
import { obterConfirmacoesComunicadoAdmin } from "../../api/comunicados.api";
import type { ConfirmacaoComunicado } from "../../tipos/comunicados";

import "../../pages/PaginaBase.css";
import "./PaginaAdminCriarComunicado.css";
import "../../components/ImageUploadField/ImageUploadField.css";

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
    const [confirmacoes, setConfirmacoes] = useState<ConfirmacaoComunicado[]>([]);

    const [titulo, setTitulo] = useState("");
    const [descricao, setDescricao] = useState("");
    const [importancia, setImportancia] = useState<ComunicadoAdminPayload["importancia"]>("RELEVANTE");
    const [fixadoTopo, setFixadoTopo] = useState(false);
    const [requerConfirmacao, setRequerConfirmacao] = useState(false);
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
                setRequerConfirmacao(Boolean(data?.requer_confirmacao));
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

            // buscar lista de confirmações (apenas para editar)
            try {
                const resp: any = await obterConfirmacoesComunicadoAdmin({ token: sessao.token, id: comunicadoId });
                setConfirmacoes(resp.items || []);
            } catch (e: any) { }
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
            requer_confirmacao: requerConfirmacao,
            anexo_url: anexo?.url || undefined,
            anexo_tipo: anexo?.tipo && anexo.tipo !== "NENHUM" ? anexo.tipo : "NENHUM"
        };
    }, [titulo, descricao, importancia, fixadoTopo, requerConfirmacao, expiraEm, anexo]);

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

        // Validar imagem se for imagem
        if (tipoInferido === "IMAGEM") {
            const validation = await validateImage(file, "COMUNICADO", 5 * 1024 * 1024);
            if (!validation.isValid) {
                setErro(validation.error || "Imagem inválida");
                return;
            }
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
            <SidebarAdmin
                estaLogado={Boolean(sessao?.token)}
                aoIrParaHome={() => navigate("/admin/home")}
                aoCriarComunicado={() => navigate("/admin/criar-comunicado")}
                aoDocumentos={() => navigate("/admin/documentos")}
                aoColaboradores={() => navigate("/admin/colaboradores")}
                aoCalendario={() => navigate("/admin/calendario")}
                aoFaq={() => navigate("/admin/faq")}
                aoFaleComRh={() => navigate("/admin/fale-com-rh")}
                aoRelatorios={() => navigate("/admin/relatorios")}
                aoCarrossel={() => navigate("/admin/carousel")}
                aoSair={() => {
                    sair();
                    navigate("/", { replace: true });
                }}
            />


            <main className="paginaBase__conteudo">
                <BotaoVoltar destino="/admin/comunicados" />
                <div className="paginaBase__topoInterno">
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

                        <label className="admCriar__check">
                            <input type="checkbox" checked={requerConfirmacao} onChange={(e) => setRequerConfirmacao(e.target.checked)} />
                            <span>Requer confirmação de leitura</span>
                        </label>
                    </div>

                    <aside className="card admCriar__anexo">
                        <div className="admCriar__anexoTopo">
                            <div className="admCriar__anexoTitulo">
                                <Paperclip size={18} /> Anexo (opcional)
                            </div>
                            <div className="admCriar__anexoSub">Imagem ou PDF para ilustrar o comunicado</div>
                        </div>

                        {!anexo ? (
                            <div style={{ padding: "16px 0" }}>
                                <ImageUploadField
                                    label="Anexo (Imagem)"
                                    context="COMUNICADO"
                                    selectedFile={file}
                                    onFileSelect={setFile}
                                    showRecommendations={true}
                                />

                                {file && inferTipo(file) === "IMAGEM" && (
                                    <button
                                        type="button"
                                        className="admCriar__btnAnexo"
                                        onClick={enviarAnexo}
                                        disabled={uploading || !file}
                                        style={{ marginTop: "12px" }}
                                    >
                                        {uploading ? "Enviando..." : "Enviar anexo"}
                                    </button>
                                )}
                            </div>
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
                {comunicadoId ? (
                    <section className="card admCriar__confirmacoes">
                        <h3>Confirmações de leitura</h3>
                        <div>Total: <strong>{confirmacoes.length}</strong></div>
                        {confirmacoes.length === 0 ? (
                            <div>Nenhuma confirmação ainda.</div>
                        ) : (
                            <ul className="admCriar__confirmList">
                                {confirmacoes.map((c) => (
                                    <li key={c.id}>{c.colaborador_nome} — {new Date(c.confirmed_at).toLocaleString()}</li>
                                ))}
                            </ul>
                        )}
                    </section>
                ) : null}
            </main>
        </div>
    );
}
