import { bearerHeaders, httpDelete, httpGet, httpPost, httpPostFormData, httpPut } from "./clienteHttp";

const BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:4000";
const API_BASE_URL = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;

export type NoBiblioteca = {
    id: string | number;
    nome: string;
    tipo: "PASTA" | "DOCUMENTO";
    url?: string | null;
    filhos?: NoBiblioteca[];
};

function absolutizarUrl(u?: string | null) {
    if (!u) return null;
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    return `${API_BASE_URL}${u.startsWith("/") ? "" : "/"}${u}`;
}

function normalizarArvore(data: any): NoBiblioteca[] {
    const arr = data?.items || data?.tree || data;
    if (!Array.isArray(arr)) return [];

    const mapear = (n: any): NoBiblioteca => {
        const tipo = String(n.tipo || n.kind || "").toUpperCase() === "DOCUMENTO" ? "DOCUMENTO" : "PASTA";
        const filhosRaw = n.filhos ?? n.children;

        const node: NoBiblioteca = {
            id: n.id ?? n.codigo ?? `${n.nome}-${Math.random()}`,
            nome: String(n.nome || n.titulo || "SEM_NOME"),
            tipo,
            url: tipo === "DOCUMENTO" ? absolutizarUrl(n.url || n.arquivo_url || n.documento_url) : null
        };

        if (tipo === "PASTA") {
            node.filhos = Array.isArray(filhosRaw) ? filhosRaw.map(mapear) : [];
        }

        return node;
    };

    return arr.map(mapear);
}

/* =========================
   PÚBLICO
========================= */

export async function obterArvoreBiblioteca(signal?: AbortSignal) {
    const data = await httpGet<any>("/biblioteca/arvore", { signal });
    return normalizarArvore(data);
}

/* =========================
   ADMIN
========================= */

export type PastaAdmin = {
    id: number;
    nome: string;
    slug: string;
};

export async function criarPastaAdmin(params: { token: string; nome: string }, signal?: AbortSignal) {
    return httpPost<PastaAdmin>("/admin/biblioteca/pastas", { nome: params.nome }, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

// Estes 2 endpoints exigem que você tenha implementado no backend:
// PUT /admin/biblioteca/pastas/:pastaId
// DELETE /admin/biblioteca/pastas/:pastaId
export async function atualizarPastaAdmin(params: { token: string; pastaId: number; nome: string }, signal?: AbortSignal) {
    return httpPut<PastaAdmin>(`/admin/biblioteca/pastas/${params.pastaId}`, { nome: params.nome }, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export async function excluirPastaAdmin(params: { token: string; pastaId: number }, signal?: AbortSignal) {
    return httpDelete<void>(`/admin/biblioteca/pastas/${params.pastaId}`, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export async function adicionarDocumentoAdmin(params: { token: string; pastaId: number; nome: string; file: File }, signal?: AbortSignal) {
    const form = new FormData();
    form.append("nome", params.nome);
    form.append("file", params.file);

    return httpPostFormData<any>(`/admin/biblioteca/pastas/${params.pastaId}/documentos`, form, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export async function excluirDocumentoAdmin(params: { token: string; docId: number }, signal?: AbortSignal) {
    return httpDelete<void>(`/admin/biblioteca/documentos/${params.docId}`, {
        signal,
        headers: bearerHeaders(params.token)
    });
}
