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

type Opts = {
    signal?: AbortSignal;
    timeoutMs?: number;
    headers?: Record<string, string>;
};

function criarSignalComTimeout(opts?: Opts) {
    const timeoutMs = opts?.timeoutMs ?? 12000;
    const controller = new AbortController();

    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    // Se o chamador abortar, aborta o nosso controller também
    let onAbort: (() => void) | null = null;
    if (opts?.signal) {
        onAbort = () => controller.abort();
        if (opts.signal.aborted) controller.abort();
        else opts.signal.addEventListener("abort", onAbort, { once: true });
    }

    const limpar = () => {
        window.clearTimeout(timeout);
        if (opts?.signal && onAbort) {
            opts.signal.removeEventListener("abort", onAbort);
        }
    };

    return { signal: controller.signal, limpar };
}

export function bearerHeaders(token?: string) {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

/* =========================
   AUTH: logout global (sem acoplar em hook)
========================= */

function mensagemSessaoExpirada() {
    return "Sua sessão expirou. Faça login novamente para continuar.";
}

function publicarLogoutGlobal(mensagem?: string) {
    window.dispatchEvent(new CustomEvent("auth:logout", { detail: { message: mensagem || mensagemSessaoExpirada() } }));
}

function extrairMensagemErro(body: any, status: number) {
    return body?.error?.message || body?.message || `Falha na requisição (${status}).`;
}

function pareceErroDeToken(msg: string) {
    const m = String(msg || "").toLowerCase();
    // cobre: "Token inválido ou expirado", "jwt expired", etc.
    return (
        m.includes("token") &&
        (m.includes("expir") || m.includes("inval") || m.includes("invál") || m.includes("jwt"))
    );
}

function tratarAuthAutoLogout(status: number, msg: string) {
    // IMPORTANTE: somente para 401/403
    if (status !== 401 && status !== 403) return;

    // Só dispara logout se realmente for token
    if (pareceErroDeToken(msg)) {
        publicarLogoutGlobal(mensagemSessaoExpirada());
    }
}

export async function httpGet<T>(caminho: string, opts?: Opts): Promise<T> {
    const { signal, limpar } = criarSignalComTimeout(opts);

    try {
        const res = await fetch(montarUrl(caminho), {
            method: "GET",
            headers: { Accept: "application/json", ...(opts?.headers || {}) },
            signal
        });

        const contentType = res.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

        if (!res.ok) {
            const msg = extrairMensagemErro(body as any, res.status);
            tratarAuthAutoLogout(res.status, msg);
            throw new ErroHttp(msg, res.status, body);
        }

        return body as T;
    } finally {
        limpar();
    }
}

export async function httpPost<T>(caminho: string, body: unknown, opts?: Opts): Promise<T> {
    const { signal, limpar } = criarSignalComTimeout(opts);

    try {
        const res = await fetch(montarUrl(caminho), {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                ...(opts?.headers || {})
            },
            body: JSON.stringify(body),
            signal
        });

        const contentType = res.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

        if (!res.ok) {
            const msg = extrairMensagemErro(payload as any, res.status);
            tratarAuthAutoLogout(res.status, msg);
            throw new ErroHttp(msg, res.status, payload);
        }

        return payload as T;
    } finally {
        limpar();
    }
}
