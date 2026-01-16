import { httpGet } from "./clienteHttp";
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
            url: tipo === "DOCUMENTO" ? absolutizarUrl(n.url || n.arquivo_url || n.documento_url) : null,
        };

        if (tipo === "PASTA") {
            node.filhos = Array.isArray(filhosRaw) ? filhosRaw.map(mapear) : [];
        }

        return node;
    };

    return arr.map(mapear);
}

export async function obterArvoreBiblioteca(signal?: AbortSignal) {
    const data = await httpGet<any>("/biblioteca/arvore", { signal });
    return normalizarArvore(data);
}
