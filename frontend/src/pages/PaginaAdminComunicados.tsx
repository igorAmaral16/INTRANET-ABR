import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

import { BarraTopo } from "../components/BarraTopo/BarraTopo";
import { useSessaoAuth } from "../hooks/useSessaoAuth";
import { ErroHttp } from "../api/clienteHttp";
import { listarComunicadosAdmin, excluirComunicadoAdmin, type ComunicadoAdminItem } from "../api/comunicados.api";

import "./PaginaComunicados.css";

function isAbortError(e: any) {
    return (
        e?.name === "AbortError" ||
        String(e?.message || "").toLowerCase().includes("aborted") ||
        String(e?.message || "").toLowerCase().includes("abort")
    );
}

export function PaginaAdminComunicados() {
    const navigate = useNavigate();
    const { sessao, estaLogadoAdmin, sair } = useSessaoAuth();

    const [estado, setEstado] = useState<"carregando" | "erro" | "pronto">("carregando");
    const [erro, setErro] = useState<string | null>(null);
    const [itens, setItens] = useState<ComunicadoAdminItem[]>([]);
    const [busca, setBusca] = useState("");

    const [menuAbertoId, setMenuAbertoId] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const acRef = useRef<AbortController | null>(null);

    const estaLogado = Boolean(sessao?.token);
    const role = sessao?.role;

    const filtrados = useMemo(() => {
        const b = busca.trim().toLowerCase();
        if (!b) return itens;
        return itens.filter((x) => {
            const t = `${x.titulo} ${x.descricao}`.toLowerCase();
            return t.includes(b);
        });
    }, [itens, busca]);

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
                const data = await listarComunicadosAdmin(
                    { token: sessao.token, page: 1, pageSize: 50 },
                    ac.signal
                );

                const items = Array.isArray((data as any)?.items) ? (data as any).items : [];
                setItens(items);
                setEstado("pronto");
            } catch (e: any) {
                if (isAbortError(e)) return;

                const msg = e instanceof ErroHttp ? e.message : e?.message;
                setErro(msg || "Não foi possível carregar os comunicados do painel.");
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

        const ok = window.confirm("Deseja realmente excluir este comunicado? Essa ação não pode ser desfeita.");
        if (!ok) return;

        try {
            await excluirComunicadoAdmin({ token: sessao.token, id });
            setItens((prev) => prev.filter((x) => x.id !== id));
            setMenuAbertoId(null);
        } catch (e: any) {
            const msg = e instanceof ErroHttp ? e.message : e?.message;
            alert(msg || "Não foi possível excluir o comunicado.");
        }
    }

    function onEditar(id: number) {
        setMenuAbertoId(null);
        navigate(`/admin/comunicados/${id}/editar`);
    }

    return (
        <div className="paginaComunicados">
            <BarraTopo
                busca={busca}
                aoMudarBusca={setBusca}
                mostrarBusca={true}
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

            <main className="paginaComunicados__conteudo">
                <section className="paginaComunicados__cabecalho">
                    <div>
                        <h1 className="paginaComunicados__titulo">Painel Administrativo</h1>
                        <p className="paginaComunicados__subtitulo">
                            Gerencie comunicados, documentos, colaboradores, FAQ e relatórios.
                        </p>
                    </div>
                </section>

                {estado === "carregando" ? <div className="card">Carregando...</div> : null}

                {estado === "erro" ? (
                    <div className="card cardErro">
                        <div style={{ fontWeight: 900, marginBottom: 8 }}>Não foi possível acessar</div>
                        <div style={{ opacity: 0.85 }}>{erro}</div>
                        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                            <button type="button" onClick={() => navigate("/")}>Voltar</button>
                            <button type="button" onClick={() => window.location.reload()}>Tentar novamente</button>
                        </div>
                    </div>
                ) : null}

                {estado === "pronto" && filtrados.length === 0 ? (
                    <div className="card">Nenhum comunicado encontrado.</div>
                ) : null}

                {estado === "pronto" && filtrados.length > 0 ? (
                    <section className="paginaComunicados__lista">
                        {filtrados.map((c) => (
                            <article key={c.id} className="card" style={{ position: "relative" }}>
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                                            <span className="chip">{c.importancia}</span>
                                            <span className="meta" style={{ opacity: 0.8 }}>{c.status}</span>
                                            {c.expira_em ? <span className="meta" style={{ opacity: 0.8 }}>Expira: {c.expira_em}</span> : null}
                                        </div>

                                        <div style={{ fontWeight: 900, fontSize: 16 }}>{c.titulo}</div>
                                        <div style={{ opacity: 0.85, marginTop: 8, whiteSpace: "pre-wrap" }}>
                                            {String(c.descricao || "").slice(0, 220)}
                                            {String(c.descricao || "").length > 220 ? "..." : ""}
                                        </div>
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
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    top: 44,
                                                    right: 0,
                                                    width: 180,
                                                    background: "#fff",
                                                    border: "1px solid rgba(0,0,0,0.10)",
                                                    borderRadius: 12,
                                                    boxShadow: "0 14px 34px rgba(0,0,0,0.12)",
                                                    padding: 8,
                                                    zIndex: 20
                                                }}
                                                role="menu"
                                            >
                                                <button
                                                    type="button"
                                                    style={{
                                                        width: "100%",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 10,
                                                        padding: "10px 10px",
                                                        borderRadius: 10,
                                                        border: 0,
                                                        background: "transparent",
                                                        cursor: "pointer",
                                                        fontWeight: 800
                                                    }}
                                                    onClick={() => onEditar(c.id)}
                                                >
                                                    <Pencil size={16} /> Editar
                                                </button>

                                                <button
                                                    type="button"
                                                    style={{
                                                        width: "100%",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 10,
                                                        padding: "10px 10px",
                                                        borderRadius: 10,
                                                        border: 0,
                                                        background: "transparent",
                                                        cursor: "pointer",
                                                        fontWeight: 800,
                                                        color: "#b42318"
                                                    }}
                                                    onClick={() => onExcluir(c.id)}
                                                >
                                                    <Trash2 size={16} /> Excluir
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
