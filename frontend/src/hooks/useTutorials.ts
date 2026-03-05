import { useState, useCallback } from "react";
import { listarTutoriais, TutorialResumo } from "../api/tutorials.api";

export function useTutorials(setor: string) {
    const [itens, setItens] = useState<TutorialResumo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        if (!setor) return;
        setLoading(true);
        try {
            const res = await listarTutoriais(setor);
            setItens(res);
            setError(null);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Erro");
        } finally {
            setLoading(false);
        }
    }, [setor]);

    return { itens, loading, error, refetch };
}
