import { httpGet } from "./clienteHttp";

export type FaqItem = {
    id: string | number;
    titulo: string;
    categoria: string;
    descricao: string;
};

function normalizarFaq(data: any): FaqItem[] {
    const arr = data?.items || data;
    if (!Array.isArray(arr)) return [];

    return arr.map((x: any) => ({
        id: x.id ?? `${x.titulo}-${Math.random()}`,
        titulo: String(x.titulo || ""),
        categoria: String(x.categoria || "GERAL"),
        descricao: String(x.descricao || "")
    }));
}

export async function listarFaq(signal?: AbortSignal) {
    const data = await httpGet<any>("/faq", { signal });
    return normalizarFaq(data);
}
