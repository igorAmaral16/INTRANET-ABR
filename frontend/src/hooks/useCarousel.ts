import { useCallback, useEffect, useState, useRef } from "react";
import type { CarouselItemResumo, CarouselItemDetalhe } from "../tipos/carousel";
import { listarCarrossel, obterCarrossel } from "../api/carousel.api";

type Estado = "ocioso" | "carregando" | "erro" | "pronto";

export function useCarousel() {
    const [estado, setEstado] = useState<Estado>("carregando");
    const [erro, setErro] = useState<string | null>(null);
    const [itens, setItens] = useState<CarouselItemResumo[]>([]);
    const abortRef = useRef<AbortController | null>(null);

    const carregar = useCallback(async () => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        setEstado("carregando");
        setErro(null);
        try {
            const data = await listarCarrossel();
            setItens(data || []);
            setEstado("pronto");
        } catch (e: any) {
            if (e?.name === "AbortError") return;
            setErro(e?.message || "Falha ao carregar carrossel");
            setEstado("erro");
        }
    }, []);

    useEffect(() => {
        carregar();
        return () => abortRef.current?.abort();
    }, [carregar]);

    return { estado, erro, itens, recarregar: carregar };
}

export function useCarouselItem(id?: number) {
    const [estado, setEstado] = useState<Estado>("ocioso");
    const [erro, setErro] = useState<string | null>(null);
    const [item, setItem] = useState<CarouselItemDetalhe | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const carregar = useCallback(async () => {
        if (!id) return;
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        setEstado("carregando");
        setErro(null);
        try {
            const data = await obterCarrossel(id, ac.signal);
            setItem(data);
            setEstado("pronto");
        } catch (e: any) {
            if (e?.name === "AbortError") return;
            setErro(e?.message || "Falha ao carregar anúncio");
            setEstado("erro");
        }
    }, [id]);

    useEffect(() => {
        carregar();
        return () => abortRef.current?.abort();
    }, [carregar]);

    return { estado, erro, item, recarregar: carregar };
}
