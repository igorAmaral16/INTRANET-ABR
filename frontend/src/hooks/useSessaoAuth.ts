import { useCallback, useMemo, useState } from "react";
import { carregarSessao, limparSessao, salvarSessao, type SessaoAuth } from "../components/Estados/sessaoAuth";

export function useSessaoAuth() {
    const [sessao, setSessao] = useState<SessaoAuth | null>(() => carregarSessao());

    const estaLogadoColab = useMemo(() => sessao?.role === "COLAB", [sessao]);
    const estaLogadoAdmin = useMemo(() => sessao?.role === "ADMIN", [sessao]);

    const definirSessao = useCallback((nova: Omit<SessaoAuth, "createdAtIso">) => {
        const s: SessaoAuth = { ...nova, createdAtIso: new Date().toISOString() };
        salvarSessao(s);
        setSessao(s);
    }, []);

    const sair = useCallback(() => {
        limparSessao();
        setSessao(null);
    }, []);

    return { sessao, estaLogadoColab, estaLogadoAdmin, definirSessao, sair };
}
