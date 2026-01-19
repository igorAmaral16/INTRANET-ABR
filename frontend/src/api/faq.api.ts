import { bearerHeaders, httpDelete, httpGet, httpPost, httpPut } from "./clienteHttp";

export type FaqItem = {
    id: string | number;
    titulo: string;
    categoria: string;
    descricao: string;
    ativo?: boolean;
    ordem?: number;
};

function normalizarFaq(data: any): FaqItem[] {
    const arr = data?.items || data;
    if (!Array.isArray(arr)) return [];

    return arr.map((x: any) => ({
        id: x.id ?? `${x.titulo}-${Math.random()}`,
        titulo: String(x.titulo || ""),
        categoria: String(x.categoria || "GERAL"),
        descricao: String(x.descricao || ""),
        ativo: x.ativo !== undefined ? Boolean(x.ativo) : undefined,
        ordem: x.ordem !== undefined ? Number(x.ordem) : undefined
    }));
}

/* =========================
   PÚBLICO
========================= */

export async function listarFaq(signal?: AbortSignal) {
    const data = await httpGet<any>("/faq", { signal });
    return normalizarFaq(data);
}

/* =========================
   ADMIN
========================= */

export async function listarFaqAdmin(params: { token: string }, signal?: AbortSignal) {
    const data = await httpGet<any>("/admin/faq", {
        signal,
        headers: bearerHeaders(params.token)
    });
    return normalizarFaq(data);
}

export async function obterFaqAdmin(params: { token: string; id: number }, signal?: AbortSignal) {
    return httpGet<any>(`/admin/faq/${params.id}`, { signal, headers: bearerHeaders(params.token) });
}

export type FaqAdminPayload = {
    titulo: string;
    categoria: string;
    descricao: string;
    ativo?: boolean;
    ordem?: number;
};

export async function criarFaqAdmin(params: { token: string; body: FaqAdminPayload }, signal?: AbortSignal) {
    return httpPost<any>("/admin/faq", params.body, { signal, headers: bearerHeaders(params.token) });
}

export async function atualizarFaqAdmin(params: { token: string; id: number; body: FaqAdminPayload }, signal?: AbortSignal) {
    return httpPut<any>(`/admin/faq/${params.id}`, params.body, { signal, headers: bearerHeaders(params.token) });
}

export async function excluirFaqAdmin(params: { token: string; id: number }, signal?: AbortSignal) {
    return httpDelete<void>(`/admin/faq/${params.id}`, { signal, headers: bearerHeaders(params.token) });
}
