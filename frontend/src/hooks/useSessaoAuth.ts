import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { carregarSessao, limparSessao, salvarSessao, type SessaoAuth } from "../components/Estados/sessaoAuth";

function decodeJwtPayload(token: string): any | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        // base64url -> base64
        const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = payload + "===".slice((payload.length + 3) % 4);

        const json = atob(padded);
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function calcularMsParaExpirar(token: string) {
    const payload = decodeJwtPayload(token);
    const exp = Number(payload?.exp); // em segundos
    if (!Number.isFinite(exp) || exp <= 0) return null;

    const agoraMs = Date.now();
    const expMs = exp * 1000;

    // margem defensiva (2s) para evitar corrida
    const ms = expMs - agoraMs - 2000;
    return Math.max(0, ms);
}

export function useSessaoAuth() {
    const [sessao, setSessao] = useState<SessaoAuth | null>(() => carregarSessao());

    const timerExpRef = useRef<number | null>(null);

    const limparTimerExp = useCallback(() => {
        if (timerExpRef.current) {
            window.clearTimeout(timerExpRef.current);
            timerExpRef.current = null;
        }
    }, []);

    const estaLogadoColab = useMemo(() => sessao?.role === "COLAB", [sessao]);
    const estaLogadoAdmin = useMemo(() => sessao?.role === "ADMIN", [sessao]);

    const sair = useCallback(() => {
        limparTimerExp();
        limparSessao();
        setSessao(null);
    }, [limparTimerExp]);

    const agendarExpiracao = useCallback(
        (token?: string) => {
            limparTimerExp();
            if (!token) return;

            const ms = calcularMsParaExpirar(token);
            if (ms === null) return;

            timerExpRef.current = window.setTimeout(() => {
                // logout automático na expiração
                sair();
            }, ms);
        },
        [limparTimerExp, sair]
    );

    const definirSessao = useCallback(
        (nova: Omit<SessaoAuth, "createdAtIso">) => {
            const s: SessaoAuth = { ...nova, createdAtIso: new Date().toISOString() };
            salvarSessao(s);
            setSessao(s);

            // agenda expiração do token
            agendarExpiracao(s.token);
        },
        [agendarExpiracao]
    );

    // Quando carregar sessão do storage (refresh), agenda expiração também
    useEffect(() => {
        agendarExpiracao(sessao?.token);
        return () => limparTimerExp();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reativo: quando o clienteHttp detectar token expirado/inválido
    useEffect(() => {
        const handler = () => {
            sair();
        };

        window.addEventListener("auth:logout", handler as any);
        return () => window.removeEventListener("auth:logout", handler as any);
    }, [sair]);

    return { sessao, estaLogadoColab, estaLogadoAdmin, definirSessao, sair };
}
