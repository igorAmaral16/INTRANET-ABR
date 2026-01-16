const BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:4000";

function montarUrl(caminho: string) {
    if (!caminho.startsWith("/")) return `${BASE_URL}/${caminho}`;
    return `${BASE_URL}${caminho}`;
}

export class ErroHttp extends Error {
    status: number;
    detalhes?: unknown;

    constructor(message: string, status: number, detalhes?: unknown) {
        super(message);
        this.name = "ErroHttp";
        this.status = status;
        this.detalhes = detalhes;
    }
}

export async function httpGet<T>(
    caminho: string,
    opts?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<T> {
    const timeoutMs = opts?.timeoutMs ?? 12000;
    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let signal: AbortSignal = controller.signal;

    if (opts?.signal) {
        // Usar AbortSignal.any() se disponível (Chrome 120+, Firefox 124+)
        if (AbortSignal.any) {
            signal = AbortSignal.any([opts.signal, controller.signal]);
        } else {
            // Fallback: apenas usar o sinal do controller
            signal = controller.signal;
        }
    }

    try {
        const res = await fetch(montarUrl(caminho), {
            method: "GET",
            headers: { "Accept": "application/json" },
            signal
        });

        const contentType = res.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

        if (!res.ok) {
            const msg = (body as any)?.error?.message || `Falha na requisição (${res.status}).`;
            throw new ErroHttp(msg, res.status, body);
        }

        return body as T;
    } finally {
        clearTimeout(timeout);
    }
}
