import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { connectSocket, getSocket } from "../realtime/socketClient";

export type RhNotif = {
    id: string;
    conversationId: string;
    preview: string;
    created_at?: string | null;
};

type Ctx = {
    count: number;
    items: RhNotif[];
    clear: () => void;
    removeConversation: (conversationId: string) => void;
    push: (n: Omit<RhNotif, "id">) => void;
};

const NotifCtx = createContext<Ctx | null>(null);

// Normaliza role no FRONT igual ao que você já faz no backend
const ROLE_ALIASES = {
    ADMIN: new Set(["ADMIN", "ADMINISTRACAO", "ADMINISTRATIVO"]),
    COLAB: new Set(["COLAB", "COLABORADOR", "COLABORADORES"]),
};

function normalizeRole(roleRaw?: string | null): "COLAB" | "ADMIN" | null {
    const r = String(roleRaw || "").toUpperCase();
    if (ROLE_ALIASES.ADMIN.has(r)) return "ADMIN";
    if (ROLE_ALIASES.COLAB.has(r)) return "COLAB";
    return null;
}

export function NotificacoesRhProvider({
    children,
    role,
    token,
}: {
    children: React.ReactNode;
    role?: string | null; // <- aceitar string para não travar em literal
    token?: string | null;
}) {
    const [items, setItems] = useState<RhNotif[]>([]);
    const roleNorm = normalizeRole(role);

    // garante socket ativo quando tiver token
    useEffect(() => {
        if (!token) return;
        connectSocket(token);
    }, [token]);

    useEffect(() => {
        // Somente COLAB recebe notificação (como você definiu)
        if (roleNorm !== "COLAB") return;
        if (!token) return;

        // garante que existe socket mesmo se ele ainda não existia
        const s = getSocket() || connectSocket(token);
        if (!s) return;

        const onNotify = (p: any) => {
            const conversationId = String(p?.conversationId ?? "");
            if (!conversationId) return;

            const created_at = p?.created_at ?? null;
            const preview = String(p?.preview ?? "Nova mensagem do RH");

            const id = `${conversationId}-${created_at || Date.now()}`;

            setItems((prev) => [{ id, conversationId, preview, created_at }, ...prev].slice(0, 30));
        };

        s.on("rh:notify", onNotify);
        return () => {
            s.off("rh:notify", onNotify);
        };
    }, [roleNorm, token]);

    const value = useMemo<Ctx>(() => {
        return {
            count: items.length,
            items,
            clear: () => setItems([]),
            removeConversation: (conversationId: string) =>
                setItems((prev) => prev.filter((x) => x.conversationId !== conversationId)),
            push: (n) => {
                const id = `${n.conversationId}-${n.created_at || Date.now()}`;
                setItems((prev) => [{ id, ...n }, ...prev].slice(0, 30));
            },
        };
    }, [items]);

    return <NotifCtx.Provider value={value}>{children}</NotifCtx.Provider>;
}

export function useNotificacoesRh() {
    const ctx = useContext(NotifCtx);
    if (!ctx) throw new Error("useNotificacoesRh deve ser usado dentro de NotificacoesRhProvider");
    return ctx;
}
