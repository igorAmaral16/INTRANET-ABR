import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const SOCKET_URL = import.meta?.env?.VITE_API_URL || "http://localhost:4000";

export function connectSocket(token: string) {
    // Se já existe socket, apenas atualiza auth e conecta se necessário
    if (socket) {
        socket.auth = { token };
        if (!socket.connected) socket.connect();
        return socket;
    }

    socket = io(SOCKET_URL, {
        // Evita falhas em ambientes onde websocket puro é bloqueado/intermitente
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
