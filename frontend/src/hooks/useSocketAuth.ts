import { useEffect } from "react";
import { connectSocket, disconnectSocket } from "../realtime/socketClient";

export function useSocketAuth(token?: string | null) {
    useEffect(() => {
        if (token) connectSocket(token);
        else disconnectSocket();
    }, [token]);
}
