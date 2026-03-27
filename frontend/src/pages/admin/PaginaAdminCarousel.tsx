import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { MoreVertical, Pencil, Trash2, Plus } from "lucide-react";

import { SidebarAdmin } from "../../components/SidebarAdmin/SidebarAdmin"; import { BotaoVoltar } from "../../components/BotaoVoltar/BotaoVoltar"; import { useSessaoAuth } from "../../hooks/useSessaoAuth";
import { ErroHttp } from "../../api/clienteHttp";
import {
    listarCarrosselAdmin,
    deletarCarrossel,
    type CarouselItemResumo,
} from "../../api/carousel.api";

import "../PaginaComunicados.css";

function isAbortError(e: any) {
    return (
        e?.name === "AbortError" ||
        String(e?.message || "").toLowerCase().includes("aborted") ||
        String(e?.message || "").toLowerCase().includes("abort")
    );
}

export function PaginaAdminCarousel() {
    const navigate = useNavigate();
    const { sessao, estaLogadoAdmin, sair } = useSessaoAuth();

    const [estado, setEstado] = useState<"carregando" | "erro" | "pronto">("carregando");
    const [erro, setErro] = useState<string | null>(null);
    const [itens, setItens] = useState<CarouselItemResumo[]>([]);

    const [menuAbertoId, setMenuAbertoId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const acRef = useRef<AbortController | null>(null);



    const filtrados = useMemo(() => itens, [itens]);

    useEffect(() => {
        if (!estaLogadoAdmin || !sessao?.token) {
            setEstado("erro");
            setErro("Acesso restrito. Faça login como administrador para acessar o painel.");
            return;
        }

        acRef.current?.abort();
        const ac = new AbortController();
        acRef.current = ac;

        (async () => {
            setEstado("carregando");
            setErro(null);
            try {
                const data = await listarCarrosselAdmin(sessao.token);
                setItens(data || []);
                setEstado("pronto");
            } catch (e: any) {
                if (isAbortError(e)) return;
                const msg = e instanceof ErroHttp ? e.message : e?.message;
                setErro(msg || "Não foi possível carregar os itens do carrossel.");
                setEstado("erro");
            }
        })();

        return () => ac.abort();
    }, [estaLogadoAdmin, sessao?.token]);

    useEffect(() => {
        const onClick = (ev: MouseEvent) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(ev.target as any)) {
                setMenuAbertoId(null);
            }
        };
        window.addEventListener("mousedown", onClick);
        return () => window.removeEventListener("mousedown", onClick);
    }, []);

    async function onExcluir(id: number) {
        if (!sessao?.token) return;
        const ok = window.confirm("Deseja realmente excluir este slide? Essa ação não pode ser desfeita.");
        if (!ok) return;
        try {
            await deletarCarrossel(id, sessao.token);
            setItens((prev) => prev.filter((x) => x.id !== id));
            setMenuAbertoId(null);
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível excluir o slide.");
        }
    }

    function onEditar(id: number) {
        setMenuAbertoId(null);
        navigate(`/admin/carousel/${id}/editar`);
    }

    return (
        <div className="paginaComunicados">
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

            <main className="paginaComunicados__conteudo">
                <BotaoVoltar destino="/admin/home" />
                <section className="paginaComunicados__cabecalho">
                    <div>
                        <h1 className="paginaComunicados__titulo">Manutenção do Carrossel</h1>
                        <p className="paginaComunicados__subtitulo">
                            Adicione, edite ou remova slides exibidos na página inicial.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="paginaComunicados__btnPrim"
                        onClick={() => navigate("/admin/carousel/novo")}
                    >
                        <Plus size={16} style={{ marginRight: 6 }} />
                        Novo slide
                    </button>
                </section>

                {estado === "carregando" ? <div className="card">Carregando...</div> : null}

                {estado === "erro" ? (
                    <div className="card cardErro">
                        <div style={{ fontWeight: 900, marginBottom: 8 }}>Não foi possível acessar</div>
                        <div style={{ opacity: 0.85 }}>{erro}</div>
                        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                            <button type="button" className="botaoVoltar" onClick={() => navigate("/")}>Voltar</button>
                            <button type="button" className="botaoVoltar" onClick={() => window.location.reload()}>Tentar novamente</button>
                        </div>
                    </div>
                ) : null}

                {estado === "pronto" && filtrados.length === 0 ? (
                    <div className="card">Nenhum slide encontrado.</div>
                ) : null}

                {estado === "pronto" && filtrados.length > 0 ? (
                    <section className="paginaComunicados__lista">
                        {filtrados.map((c) => (
                            <article key={c.id} className="card" style={{ position: "relative" }}>
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 900, fontSize: 16 }}>{c.titulo}</div>
                                        {c.publicado_em ? (
                                            <div className="meta">Publicado em: {c.publicado_em}</div>
                                        ) : null}
                                    </div>

                                    <div style={{ position: "relative" }} ref={menuAbertoId === c.id ? menuRef : undefined}>
                                        <button
                                            type="button"
                                            aria-label="Mais opções"
                                            style={{
                                                height: 38,
                                                width: 38,
                                                borderRadius: 12,
                                                border: "1px solid rgba(0,0,0,0.10)",
                                                background: "#fff",
                                                cursor: "pointer",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center"
                                            }}
                                            onClick={() => setMenuAbertoId((prev) => (prev === c.id ? null : c.id))}
                                        >
                                            <MoreVertical size={18} />
                                        </button>
                                        {menuAbertoId === c.id ? (
                                            <div className="paginaComunicados__menuOpcoes" ref={menuRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => onEditar(c.id)}
                                                >
                                                    <Pencil size={14} /> Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onExcluir(c.id)}
                                                >
                                                    <Trash2 size={14} /> Excluir
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </section>
                ) : null}
            </main>
        </div>
    );
}
