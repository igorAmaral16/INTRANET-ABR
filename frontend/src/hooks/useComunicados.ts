import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComunicadoDetalhe, ComunicadoResumo, Importancia } from "../tipos/comunicados";
import { listarComunicados, obterComunicado } from "../api/comunicados.api";

type Estado = "ocioso" | "carregando" | "erro" | "pronto";

function normalizarTexto(v: string) {
    return v.trim().toLowerCase();
}

export function useComunicados() {
    const [estado, setEstado] = useState<Estado>("carregando");
    const [erro, setErro] = useState<string | null>(null);

    const [page] = useState(1);
    const [pageSize] = useState(20);

    const [itens, setItens] = useState<ComunicadoResumo[]>([]);
    const [total, setTotal] = useState(0);

    const [busca, setBusca] = useState("");
    const [filtroImportancia, setFiltroImportancia] = useState<Importancia | "TODOS">("TODOS");

    const [detalheAberto, setDetalheAberto] = useState<ComunicadoDetalhe | null>(null);
    const [detalheEstado, setDetalheEstado] = useState<Estado>("ocioso");
    const [detalheErro, setDetalheErro] = useState<string | null>(null);

    const abortListRef = useRef<AbortController | null>(null);
    const abortDetalheRef = useRef<AbortController | null>(null);

    const carregar = useCallback(async () => {
        abortListRef.current?.abort();
        const ac = new AbortController();
        abortListRef.current = ac;

        setEstado("carregando");
        setErro(null);

        try {
            const data = await listarComunicados({ page, pageSize }, ac.signal);
            setItens(data.items || []);
            setTotal(Number(data.total || 0));
            setEstado("pronto");
        } catch (e: any) {
            if (e?.name === "AbortError") return;
            setErro(e?.message || "Falha ao carregar comunicados.");
            setEstado("erro");
        }
    }, [page, pageSize]);

    useEffect(() => {
        carregar();
        return () => abortListRef.current?.abort();
    }, [carregar]);

    const itensFiltrados = useMemo(() => {
        const b = normalizarTexto(busca);
        return (itens || [])
            .filter((c) => (filtroImportancia === "TODOS" ? true : c.importancia === filtroImportancia))
            .filter((c) => {
                if (!b) return true;
                const t = normalizarTexto(c.titulo || "");
                return t.includes(b);
            })
            .sort((a, b2) => {
                const af = Number(a.fixado_topo ? 1 : 0);
                const bf = Number(b2.fixado_topo ? 1 : 0);
                if (bf !== af) return bf - af;
                return (b2.created_at || "").localeCompare(a.created_at || "");
            });
    }, [itens, busca, filtroImportancia]);

    const abrirDetalhe = useCallback(async (id: number) => {
        abortDetalheRef.current?.abort();
        const ac = new AbortController();
        abortDetalheRef.current = ac;

        setDetalheEstado("carregando");
        setDetalheErro(null);

        try {
            const data = await obterComunicado(id, ac.signal);
            setDetalheAberto(data);
            setDetalheEstado("pronto");
        } catch (e: any) {
            if (e?.name === "AbortError") return;
            setDetalheErro(e?.message || "Falha ao abrir comunicado.");
            setDetalheEstado("erro");
        }
    }, []);

    const fecharDetalhe = useCallback(() => {
        abortDetalheRef.current?.abort();
        setDetalheAberto(null);
        setDetalheEstado("ocioso");
        setDetalheErro(null);
    }, []);

    return {
        estado,
        erro,
        total,
        itens: itensFiltrados,

        busca,
        setBusca,
        filtroImportancia,
        setFiltroImportancia,

        recarregar: carregar,

        detalheAberto,
        detalheEstado,
        detalheErro,
        abrirDetalhe,
        fecharDetalhe
    };
}
