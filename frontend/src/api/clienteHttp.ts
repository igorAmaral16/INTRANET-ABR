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

export type HeadersMap = Record<string, string>;

type Opts = {
    signal?: AbortSignal;
    timeoutMs?: number;
    headers?: HeadersMap;
};

type OptsDelete = Opts & {
    body?: unknown;
};

function criarSignalComTimeout(opts?: Opts) {
    const timeoutMs = opts?.timeoutMs ?? 12000;
    const controller = new AbortController();

    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

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

export function bearerHeaders(token?: string): HeadersMap {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

/* =========================
   AUTH: logout global
========================= */

function mensagemSessaoExpirada() {
    return "Sua sessão expirou. Faça login novamente para continuar.";
}

function publicarLogoutGlobal(mensagem?: string) {
    window.dispatchEvent(
        new CustomEvent("auth:logout", { detail: { message: mensagem || mensagemSessaoExpirada() } })
    );
}

function extrairMensagemErro(body: any, status: number) {
    return body?.error?.message || body?.message || `Falha na requisição (${status}).`;
}

function pareceErroDeToken(msg: string) {
    const m = String(msg || "").toLowerCase();
    return (
        m.includes("token") &&
        (m.includes("expir") || m.includes("inval") || m.includes("invál") || m.includes("jwt"))
    );
}

function tratarAuthAutoLogout(status: number, msg: string) {
    if (status !== 401 && status !== 403) return;
    if (pareceErroDeToken(msg)) {
        publicarLogoutGlobal(mensagemSessaoExpirada());
    }
}

/* =========================
   Helpers para resposta
========================= */

async function lerBodyResposta(res: Response) {
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    if (isJson) return await res.json().catch(() => null);
    return await res.text().catch(() => null);
}

export async function httpGet<T>(caminho: string, opts?: Opts): Promise<T> {
    const { signal, limpar } = criarSignalComTimeout(opts);

    try {
        const res = await fetch(montarUrl(caminho), {
            method: "GET",
            headers: { Accept: "application/json", ...(opts?.headers || {}) },
            signal
        });

        const body = await lerBodyResposta(res);

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

        const payload = await lerBodyResposta(res);

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

export async function httpPut<T>(caminho: string, body: unknown, opts?: Opts): Promise<T> {
    const { signal, limpar } = criarSignalComTimeout(opts);

    try {
        const res = await fetch(montarUrl(caminho), {
            method: "PUT",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                ...(opts?.headers || {})
            },
            body: JSON.stringify(body),
            signal
        });

        const payload = await lerBodyResposta(res);

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

export async function httpDelete<T>(caminho: string, opts?: OptsDelete): Promise<T> {
    const { signal, limpar } = criarSignalComTimeout(opts);

    try {
        const hasBody = opts?.body !== undefined;

        const res = await fetch(montarUrl(caminho), {
            method: "DELETE",
            headers: {
                Accept: "application/json",
                ...(hasBody ? { "Content-Type": "application/json" } : {}),
                ...(opts?.headers || {})
            },
            body: hasBody ? JSON.stringify(opts?.body) : undefined,
            signal
        });

        if (res.status === 204) return undefined as T;

        const payload = await lerBodyResposta(res);

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

export async function httpPostFormData<T>(caminho: string, form: FormData, opts?: Opts): Promise<T> {
    const { signal, limpar } = criarSignalComTimeout(opts);

    try {
        const res = await fetch(montarUrl(caminho), {
            method: "POST",
            headers: {
                Accept: "application/json",
                ...(opts?.headers || {})
            },
            body: form,
            signal
        });

        const payload = await lerBodyResposta(res);

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

export async function httpPostDownloadBlob(caminho: string, body: unknown, opts?: Opts): Promise<Blob> {
    const { signal, limpar } = criarSignalComTimeout(opts);

    try {
        const res = await fetch(montarUrl(caminho), {
            method: "POST",
            headers: {
                Accept: "application/pdf",
                "Content-Type": "application/json",
                ...(opts?.headers || {})
            },
            body: JSON.stringify(body),
            signal
        });

        if (!res.ok) {
            const payload = await lerBodyResposta(res);
            const msg = extrairMensagemErro(payload as any, res.status);
            tratarAuthAutoLogout(res.status, msg);
            throw new ErroHttp(msg, res.status, payload);
        }

        return await res.blob();
    } finally {
        limpar();
    }
}

export async function httpDeleteJson<T>(caminho: string, body: unknown, opts?: Opts): Promise<T> {
    const { signal, limpar } = criarSignalComTimeout(opts);

    try {
        const res = await fetch(montarUrl(caminho), {
            method: "DELETE",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                ...(opts?.headers || {})
            },
            body: JSON.stringify(body),
            signal
        });

        // 204 sem body
        if (res.status === 204) return null as T;

        const contentType = res.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

        if (!res.ok) {
            const msg = (payload as any)?.error?.message || `Falha na requisição (${res.status}).`;
            // reaproveita seu auto-logout, se estiver no mesmo arquivo
            // tratarAuthAutoLogout(res.status, msg);
            throw new ErroHttp(msg, res.status, payload);
        }

        return payload as T;
    } finally {
        limpar();
    }
}

