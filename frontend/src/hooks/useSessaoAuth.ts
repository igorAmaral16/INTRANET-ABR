import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { carregarSessao, limparSessao, salvarSessao, type SessaoAuth } from "../components/Estados/sessaoAuth";

let timerLogoutGlobal: number | null = null;

function limparTimerLogout() {
    if (timerLogoutGlobal) {
        window.clearTimeout(timerLogoutGlobal);
        timerLogoutGlobal = null;
    }
}

function base64UrlDecode(str: string) {
    const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
    const base64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    try {
        return decodeURIComponent(
            decoded
                .split("")
                .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
                .join("")
        );
    } catch {
        return decoded;
    }
}

function jwtExpMs(token: string): number | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const payload = JSON.parse(base64UrlDecode(parts[1]));
        const exp = Number(payload?.exp);
        if (!Number.isFinite(exp) || exp <= 0) return null;
        return exp * 1000;
    } catch {
        return null;
    }
}

export function useSessaoAuth() {
    const [sessao, setSessao] = useState<SessaoAuth | null>(() => carregarSessao());
    const [mensagemSessao, setMensagemSessao] = useState<string | null>(null);

    const estaLogadoColab = useMemo(() => sessao?.role === "COLAB", [sessao]);
    const estaLogadoAdmin = useMemo(() => sessao?.role === "ADMIN", [sessao]);

    const sair = useCallback((msgOpcional?: string) => {
        limparTimerLogout();
        limparSessao();
        setSessao(null);
        if (msgOpcional) setMensagemSessao(msgOpcional);
    }, []);

    const definirSessao = useCallback((nova: Omit<SessaoAuth, "createdAtIso">) => {
        const s: SessaoAuth = { ...nova, createdAtIso: new Date().toISOString() };
        salvarSessao(s);
        setSessao(s);

        // agenda logout automático pelo exp do JWT (se existir)
        limparTimerLogout();
        const expMs = jwtExpMs(String(s.token || ""));
        if (expMs) {
            const agora = Date.now();
            const faltando = expMs - agora;

            // buffer (para evitar “expiro no meio do request”)
            const bufferMs = 1500;

            if (faltando <= bufferMs) {
                // já expirou (ou está para expirar)
                sair("Sua sessão expirou. Faça login novamente para continuar.");
                return;
            }

            timerLogoutGlobal = window.setTimeout(() => {
                sair("Sua sessão expirou. Faça login novamente para continuar.");
            }, Math.max(0, faltando - bufferMs));
        }
    }, [sair]);

    // IMPORTANTÍSSIMO: sincroniza logout global vindo do clienteHttp.ts
    useEffect(() => {
        const handler = (ev: Event) => {
            const e = ev as CustomEvent;
            const msg = e?.detail?.message as string | undefined;
            sair(msg || "Sua sessão expirou. Faça login novamente para continuar.");
        };

        window.addEventListener("auth:logout", handler as EventListener);
        return () => window.removeEventListener("auth:logout", handler as EventListener);
    }, [sair]);

    // Se recarregou a página e já havia sessão salva, também agenda timer
    const agendadoRef = useRef(false);
    useEffect(() => {
        if (agendadoRef.current) return;
        agendadoRef.current = true;

        if (sessao?.token) {
            limparTimerLogout();
            const expMs = jwtExpMs(String(sessao.token));
            if (expMs) {
                const faltando = expMs - Date.now();
                const bufferMs = 1500;

                if (faltando <= bufferMs) {
                    sair("Sua sessão expirou. Faça login novamente para continuar.");
                    return;
                }

                timerLogoutGlobal = window.setTimeout(() => {
                    sair("Sua sessão expirou. Faça login novamente para continuar.");
                }, Math.max(0, faltando - bufferMs));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const limparMensagemSessao = useCallback(() => setMensagemSessao(null), []);

    return {
        sessao,
        estaLogadoColab,
        estaLogadoAdmin,
        definirSessao,
        sair,
        mensagemSessao,
        limparMensagemSessao
    };
}
