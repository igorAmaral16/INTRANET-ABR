import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Upload, Image as IconImage, FileText, Trash2 } from "lucide-react";

import { BarraTopo } from "../../components/BarraTopo/BarraTopo";
import { useSessaoAuth } from "../../hooks/useSessaoAuth";
import { ErroHttp } from "../../api/clienteHttp";
import {
    criarCarrossel,
    atualizarCarrossel,
    obterCarrossel,
    type CarouselItemDetalhe,
} from "../../api/carousel.api";
import { uploadAnexoAdmin } from "../../api/uploads.api";

import "../../pages/PaginaBase.css";
import "./PaginaAdminCarousel.css";
import "./PaginaAdminCriarComunicado.css"; // reuse form / upload styles

function isAbortError(e: any) {
    return e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("abort");
}

export function PaginaAdminCarouselEdit() {
    const navigate = useNavigate();
    const { id } = useParams();
    const itemId = id ? Number(id) : null;

    const { sessao, estaLogadoAdmin, sair } = useSessaoAuth();

    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const [titulo, setTitulo] = useState("");
    const [conteudo, setConteudo] = useState("");
    const [imagemUrl, setImagemUrl] = useState("");
    const [status, setStatus] = useState<"RASCUNHO" | "PUBLICADO">("RASCUNHO");

    function hoje() {
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    const [publicadoEm, setPublicadoEm] = useState<string>(itemId ? "" : hoje());

    // anexo
    const [file, setFile] = useState<File | null>(null);
    const [anexo, setAnexo] = useState<{ url: string; tipo: "IMAGEM" | "DOCUMENTO"; mime?: string } | null>(null);
    const [uploading, setUploading] = useState(false);

    const acRef = useRef<AbortController | null>(null);

    function normalizarTipoAnexo(v: any): "IMAGEM" | "DOCUMENTO" | "NENHUM" {
        const t = String(v || "").toUpperCase();
        if (t === "IMAGEM" || t === "DOCUMENTO" || t === "NENHUM") return t as any;
        return "NENHUM";
    }

    function inferTipo(file: File | null) {
        if (!file) return "NENHUM" as const;
        if (file.type.startsWith("image/")) return "IMAGEM" as const;
        if (file.type === "application/pdf") return "DOCUMENTO" as const;
        return "NENHUM" as const;
    }

    async function enviarAnexo() {
        if (!sessao?.token) return;
        if (!file) {
            setErro("Selecione um arquivo para anexar.");
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
            const resp = await uploadAnexoAdmin({ token: sessao.token, file });
            const tipoResp = normalizarTipoAnexo((resp as any)?.type);
            if (!resp?.url || tipoResp === "NENHUM") {
                setErro("Upload não retornou URL válida.");
                return;
            }
            setAnexo({ url: resp.url, tipo: tipoResp, mime: resp.mime });
            setFile(null);
            setImagemUrl(resp.url); // also fill url field
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
        setImagemUrl("");
    }

    const modo = itemId ? "EDITAR" : "CRIAR";

    useEffect(() => {
        if (!estaLogadoAdmin || !sessao?.token) {
            navigate("/", { replace: true });
            return;
        }

        if (!itemId) return;

        acRef.current?.abort();
        const ac = new AbortController();
        acRef.current = ac;

        (async () => {
            setCarregando(true);
            setErro(null);
            try {
                const data: CarouselItemDetalhe = await obterCarrossel(itemId, ac.signal);
                setTitulo(data.titulo || "");
                setConteudo(data.conteudo || "");
                setImagemUrl(data.imagem_url || "");
                setStatus((data.status as any) || "RASCUNHO");
                setPublicadoEm(data.publicado_em || "");
            } catch (e: any) {
                if (isAbortError(e)) return;
                const msg = e instanceof ErroHttp ? e.message : e?.message;
                setErro(msg || "Falha ao carregar o slide.");
            } finally {
                setCarregando(false);
            }
        })();

        return () => ac.abort();
    }, [estaLogadoAdmin, sessao?.token, itemId, navigate]);

    const payload = useMemo(() => {
        return {
            titulo: titulo.trim(),
            conteudo: conteudo.trim(),
            imagem_url: imagemUrl.trim() || anexo?.url || undefined,
            status,
            publicado_em: publicadoEm.trim() || undefined,
        } as Partial<CarouselItemDetalhe>;
    }, [titulo, conteudo, imagemUrl, anexo, status, publicadoEm]);

    async function salvar() {
        if (!sessao?.token) return;
        if (!payload.titulo || payload.titulo.length < 3) {
            setErro("Informe um título válido.");
            return;
        }
        if (publicadoEm && !/^\d{2}\/\d{2}\/\d{4}$/.test(publicadoEm)) {
            setErro("Data de publicação inválida, use dd/mm/aaaa.");
            return;
        }

        setCarregando(true);
        setErro(null);
        try {
            if (itemId) {
                await atualizarCarrossel({ token: sessao.token, id: itemId, body: payload });
            } else {
                await criarCarrossel({ token: sessao.token, body: payload });
            }
            navigate("/admin/carousel", { replace: true });
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            setErro(msg || "Não foi possível salvar o slide.");
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
                aoAdminFaleComRh={() => navigate("/admin/fale-com-rh")}
                aoAdminRelatorios={() => navigate("/admin/relatorios")}
                aoAdminCarousel={() => navigate("/admin/carousel")}

                aoSair={() => {
                    sair();
                    navigate("/", { replace: true });
                }}
            />

            <main className="paginaBase__conteudo">
                <button
                    type="button"
                    className="botaoVoltar paginaBase__voltar"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft size={18} /> Voltar
                </button>

                <h1>{modo === "CRIAR" ? "Novo slide" : "Editar slide"}</h1>

                <div className="admCriar__form">
                    {erro && <div className="paginaBase__erro">{erro}</div>}
                    <label className="admCriar__campo">
                        <span>Título</span>
                        <input
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                        />
                    </label>
                    <label className="admCriar__campo">
                        <span>Conteúdo (HTML permitido)</span>
                        <textarea
                            rows={6}
                            value={conteudo}
                            onChange={(e) => setConteudo(e.target.value)}
                        />
                    </label>
                    <label className="admCriar__campo">
                        <span>URL da imagem (ou faça upload abaixo)</span>
                        <input
                            value={imagemUrl}
                            onChange={(e) => setImagemUrl(e.target.value)}
                            placeholder="/uploads/exemplo.jpg ou https://..."
                        />
                    </label>

                    <aside className="card admCriar__anexo">
                        <div className="admCriar__anexoTopo">
                            <div className="admCriar__anexoTitulo">
                                <Upload size={18} /> Imagem do slide
                            </div>
                            <div className="admCriar__anexoSub">Envie PNG/JPG/WEBP (&lt;5MB) ou PDF.</div>
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
                                            <div className="admCriar__fileHint">Até 5MB (backend).</div>
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
                                    {uploading ? "Enviando..." : "Enviar imagem"}
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
                                        <img src={anexo.url} alt="Preview" loading="lazy" />
                                    </div>
                                ) : (
                                    <a className="admCriar__linkPdf" href={anexo.url} target="_blank" rel="noreferrer">
                                        Abrir PDF em nova aba
                                    </a>
                                )}

                                <button type="button" className="admCriar__btnRemover" onClick={removerAnexo}>
                                    <Trash2 size={16} /> Remover
                                </button>
                            </div>
                        )}
                    </aside>
                    <label>
                        Status
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                        >
                            <option value="RASCUNHO">RASCUNHO</option>
                            <option value="PUBLICADO">PUBLICADO</option>
                        </select>
                    </label>
                    <label>
                        Publicado em (dd/mm/aaaa)
                        <input
                            value={publicadoEm}
                            onChange={(e) => setPublicadoEm(e.target.value)}
                        />
                    </label>
                    <button
                        type="button"
                        className="admCriar__btnPrimario"
                        onClick={salvar}
                        disabled={carregando}
                    >
                        <Save size={16} style={{ marginRight: 6 }} />
                        {modo === "CRIAR" ? "Criar" : "Atualizar"}
                    </button>
                </div>
            </main>
        </div>
    );
}
