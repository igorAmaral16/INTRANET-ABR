import { bearerHeaders, httpGet, httpPost, httpPut, httpDeleteJson } from "./clienteHttp";

export type Evento = {
    id: number;
    titulo: string;
    descricao: string;
    data_inicio: string;
    data_fim: string;
    local?: string;
    imagem_url?: string;
    status?: string;
    publicado_por_nome?: string;
};

export type ListaEventosResponse = {
    items: Evento[];
    total: number;
    page: number;
    pageSize: number;
};

/**
 * Listar eventos publicados
 */
export async function listarEventosPublicados(signal?: AbortSignal) {
    return httpGet<{ eventos: Evento[] }>(`/eventos`, { signal });
}

/**
 * Obter evento atual (em andamento)
 */
export async function obterEventoAtual(signal?: AbortSignal) {
    return httpGet<{ evento: Evento | null }>(`/eventos/atual`, { signal });
}

/**
 * Obter um evento específico
 */
export async function obterEvento(id: number | string, signal?: AbortSignal) {
    return httpGet<Evento>(`/eventos/${id}`, { signal });
}

/**
 * ADMIN: Listar eventos (com paginação)
 */
export async function listarEventosAdmin(
    params: { token: string; page: number; pageSize: number; status?: string },
    signal?: AbortSignal
) {
    const qs = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
    });
    if (params.status && params.status !== "TODOS") qs.set("status", params.status);

    return httpGet<ListaEventosResponse>(`/admin/eventos?${qs.toString()}`, {
        signal,
        headers: bearerHeaders(params.token),
    });
}

/**
 * ADMIN: Criar evento
 */
export async function criarEventoAdmin(
    params: {
        token: string;
        body: {
            titulo: string;
            descricao: string;
            data_inicio: string;
            data_fim: string;
            local?: string;
            imagem_url?: string;
            status?: string;
        };
    },
    signal?: AbortSignal
) {
    return httpPost<Evento>(`/admin/eventos`, params.body, {
        signal,
        headers: bearerHeaders(params.token),
    });
}

/**
 * ADMIN: Atualizar evento
 */
export async function atualizarEventoAdmin(
    params: {
        token: string;
        id: number;
        body: Partial<{
            titulo: string;
            descricao: string;
            data_inicio: string;
            data_fim: string;
            local: string;
            imagem_url: string;
            status: string;
        }>;
    },
    signal?: AbortSignal
) {
    return httpPut(`/admin/eventos/${params.id}`, params.body, {
        signal,
        headers: bearerHeaders(params.token),
    });
}

/**
 * ADMIN: Excluir evento
 */
export async function excluirEventoAdmin(
    params: { token: string; id: number },
    signal?: AbortSignal
) {
    return httpDeleteJson(`/admin/eventos/${params.id}`, {
        signal,
        headers: bearerHeaders(params.token),
    });
}
