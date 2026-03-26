import { useEffect, useState, useCallback } from "react";
import { listarAniversariantesMes, Aniversariante } from "../api/aniversariantes.api";

export function useAniversariantesPublico() {
    const [aniversariantes, setAniversariantes] = useState<Aniversariante[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    const buscar = useCallback(async () => {
        try {
            setCarregando(true);
            setErro(null);

            const ac = new AbortController();
            const dados = await listarAniversariantesMes(ac.signal);

            // Processar dados para extrair primeiro e segundo nome
            const processados = dados.map(aniv => ({
                ...aniv,
                nome_completo: extrairPrimeiroDoNomes(aniv.nome_completo)
            }));

            setAniversariantes(processados);
        } catch (err: any) {
            const mensagem = err?.message || "Erro ao carregar aniversariantes";
            setErro(mensagem);
            setAniversariantes([]);
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        buscar();
    }, [buscar]);

    return {
        aniversariantes,
        carregando,
        erro,
        recarregar: buscar
    };
}

function extrairPrimeiroDoNomes(nomeCompleto: string): string {
    const nomes = nomeCompleto.trim().split(/\s+/);
    return nomes.length > 1
        ? `${nomes[0]} ${nomes[1]}`
        : nomeCompleto;
}
