import { useEffect, useState } from "react";
import { listarEventos, type CarouselItemDetalhe } from "../api/carousel.api";

export interface Evento extends CarouselItemDetalhe {
    // extends CarouselItemDetalhe para ter titulo, conteudo, foto_perfil, etc
}

export function useEventos() {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [estado, setEstado] = useState<"carregando" | "pronto" | "erro">("carregando");
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        buscarEventos();
    }, []);

    const buscarEventos = async () => {
        try {
            setEstado("carregando");
            setErro(null);

            const data = await listarEventos();
            setEventos((data as Evento[]) || []);
            setEstado("pronto");
        } catch (err: any) {
            const mensagem = err?.message || "Erro ao carregar eventos";
            setErro(mensagem);
            setEstado("erro");
        }
    };

    return {
        eventos,
        eventoAtual: null, // Não há mais "evento atual" nos slides do carrossel
        estado,
        erro,
        recarregar: buscarEventos,
    };
}
