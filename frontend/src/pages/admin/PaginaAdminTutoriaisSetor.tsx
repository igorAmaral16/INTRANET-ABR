import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Video as IconVideo,
    UploadCloud as IconUpload,
} from "lucide-react";
import { SidebarAdmin } from "../../components/SidebarAdmin/SidebarAdmin";
import { BotaoVoltar } from "../../components/BotaoVoltar/BotaoVoltar";
import "./PaginaAdminTutoriais.css";
import { listarTutoriaisAdmin } from "../../api/tutorials.api";
import { useSessaoAuth } from "../../hooks/useSessaoAuth";

export function PaginaAdminTutoriaisSetor() {
    const { setor: paramSetor } = useParams();
    const setor = paramSetor || "";
    const [titulo, setTitulo] = useState("");
    const [descricao, setDescricao] = useState("");
    const [dataPub, setDataPub] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const [lista, setLista] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<number>(0);

    const navigate = useNavigate();
    const { sessao, sair } = useSessaoAuth();

    async function carregar() {
        setLoading(true);
        try {
            const res = await listarTutoriaisAdmin(setor, sessao?.token);
            setLista(res);
        } catch (err) {
            console.error(err);
            setError("falha ao carregar");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (setor) carregar();
    }, [setor]);

    async function enviar(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (!file) {
            setError("Selecione um arquivo de vídeo");
            return;
        }
        if (!sessao?.token) {
            setError("Token não disponível");
            return;
        }
        if (!titulo.trim() || !descricao.trim()) {
            setError("Título e descrição são obrigatórios.");
            return;
        }
        if (titulo.trim().length < 3) {
            setError("Título deve ter ao menos 3 caracteres.");
            return;
        }
        if (descricao.trim().length < 3) {
            setError("Descrição deve ter ao menos 3 caracteres.");
            return;
        }
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataPub)) {
            setError("Data de publicação inválida (use dd/mm/aaaa).");
            return;
        }
        if (file.size > 200 * 1024 * 1024) {
            setError("Arquivo maior que 200MB não é permitido.");
            return;
        }

        try {
            // debug information for server validation failures
            console.log({ titulo, descricao, setor, dataPub, file });

            const form = new FormData();
            form.append("titulo", titulo);
            form.append("descricao", descricao);
            form.append("setor", setor);
            form.append("data_publicacao", dataPub);
            if (file) form.append("file", file);

            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", "/api/admin/tutorials");
                xhr.setRequestHeader("Authorization", `Bearer ${sessao.token}`);
                xhr.upload.onprogress = (ev) => {
                    if (ev.lengthComputable) {
                        setProgress(Math.round((ev.loaded / ev.total) * 100));
                    }
                };
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        // try parse error JSON
                        let msg = `HTTP ${xhr.status}`;
                        try {
                            const body = JSON.parse(xhr.responseText);
                            console.log("response body", body);
                            msg = body?.error?.message || body?.message || msg;
                            if (body?.error?.fields) {
                                msg +=
                                    " (" +
                                    body.error.fields.map((f: any) => `${f.path}: ${f.message}`).join(", ") +
                                    ")";
                            }
                        } catch (e) {
                            // ignore
                        }
                        reject(new Error(msg));
                    }
                };
                xhr.onerror = () => reject(new Error("Erro de rede"));
                xhr.send(form);
            });

            alert("Vídeo criado");
            setTitulo("");
            setDescricao("");
            setDataPub("");
            setFile(null);
            setProgress(0);
            carregar();
        } catch (err: any) {
            console.error(err);
            const msg = err?.message || "Erro ao criar tutorial";
            setError(msg);
        }
    }

    return (
        <div className="paginaBase paginaAdminTutoriais">
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
                <BotaoVoltar destino="/admin/tutoriais" />
                <div className="paginaBase__topoInterno">
                    <div className="admDocs__header">
                        <h1 className="paginaBase__titulo">
                            <IconVideo size={20} /> Tutoriais ({setor})
                        </h1>
                    </div>
                </div>

                <form onSubmit={enviar} className="form" encType="multipart/form-data">
                    <div className="field">
                        <label>Título</label>
                        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
                    </div>
                    <div className="field">
                        <label>Descrição</label>
                        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
                    </div>
                    <div className="field">
                        <label>Data publicação (dd/mm/aaaa)</label>
                        <input value={dataPub} onChange={(e) => setDataPub(e.target.value)} required placeholder="dd/mm/aaaa" />
                    </div>
                    <div className="field">
                        <label>Arquivo</label>
                        <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
                    </div>
                    <button type="submit">
                        <IconUpload size={18} /> Enviar
                    </button>
                </form>

                {progress > 0 && (
                    <div className="upload-progress">
                        <progress value={progress} max={100} /> {progress}%
                    </div>
                )}

                <section className="lista">
                    <h2>Vídeos existentes ({setor})</h2>
                    {loading && <p>Carregando...</p>}
                    {error && <p className="error">{error}</p>}
                    {lista.map((t) => (
                        <div key={t.id} className="item">
                            <IconVideo size={16} /> <strong>{t.titulo}</strong> - {t.data_publicacao}
                        </div>
                    ))}
                </section>
            </main>
        </div>
    );
}
