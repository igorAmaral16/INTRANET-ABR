import { useEffect, useState } from "react";
import { listarEventosPublicados, obterEventoAtual, Evento } from "../api/eventos.api";

export function useEventos() {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [eventoAtual, setEventoAtual] = useState<Evento | null>(null);
    const [estado, setEstado] = useState<"carregando" | "pronto" | "erro">("carregando");
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        buscarEventos();
    }, []);

    const buscarEventos = async () => {
        try {
            setEstado("carregando");
            setErro(null);

            const { eventos: data } = await listarEventosPublicados();
            setEventos(data || []);

            try {
                const { evento } = await obterEventoAtual();
                setEventoAtual(evento || null);
            } catch {
                // Evento atual é opcional, não falha se erro
            }

            setEstado("pronto");
        } catch (err: any) {
            const mensagem = err?.message || "Erro ao carregar eventos";
            setErro(mensagem);
            setEstado("erro");
        }
    };

    return {
        eventos,
        eventoAtual,
        estado,
        erro,
        recarregar: buscarEventos,
    };
}
