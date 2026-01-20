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

export function NotificacoesRhProvider({
    children,
    role,
    token,
}: {
    children: React.ReactNode;
    role?: "COLAB" | "ADMIN" | null;
    token?: string | null;
}) {
    const [items, setItems] = useState<RhNotif[]>([]);

    // Se token vier do App root, garante socket ativo mesmo fora da página do chat
    useEffect(() => {
        if (!token) return;
        connectSocket(token);
    }, [token]);

    useEffect(() => {
        if (role !== "COLAB") return;

        const s = getSocket();
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
    }, [role]);

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
