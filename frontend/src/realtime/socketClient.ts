import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// Em dev com Vite HTTPS + proxy, conecte no mesmo origin (5174)
// Em produção, você pode definir VITE_SOCKET_URL se precisar apontar para outro host.
const SOCKET_URL =
    (import.meta as any)?.env?.VITE_SOCKET_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:5174");

export function connectSocket(token: string) {
    // Se já existe socket, apenas atualiza auth e conecta se necessário
    if (socket) {
        socket.auth = { token };
        if (!socket.connected) socket.connect();
        return socket;
    }

    socket = io(SOCKET_URL, {
        path: "/socket.io", // importante para funcionar com o proxy do Vite
        transports: ["websocket", "polling"],
        auth: { token },
        autoConnect: true,
        reconnection: true,
        timeout: 20000,
        reconnectionDelayMax: 5000,
        withCredentials: true,
    });

    return socket;
}

export function getSocket() {
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
