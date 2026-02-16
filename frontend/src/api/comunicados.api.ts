import { httpGet, httpPost, httpPut, httpDelete, bearerHeaders } from "./clienteHttp";
import type { ComunicadoDetalhe, ListaComunicadosResponse } from "../tipos/comunicados";

/* =========================
   PÚBLICO
========================= */

export function listarComunicados(params: { page: number; pageSize: number }, signal?: AbortSignal) {
    const qs = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize)
    });
    return httpGet<ListaComunicadosResponse>(`/comunicados?${qs.toString()}`, { signal });
}

export function obterComunicado(id: number, signal?: AbortSignal) {
    return httpGet<ComunicadoDetalhe>(`/comunicados/${id}`, { signal });
}

// Autenticado (COLAB): retorna detalhe incluindo `confirmed_by_me` quando aplicável
export function obterComunicadoColab(params: { token: string; id: number }, signal?: AbortSignal) {
    return httpGet<ComunicadoDetalhe>(`/colaborador/comunicados/${params.id}`, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

/* =========================
   ADMIN
========================= */

export type CommunicadoAdminItem = {
    id: number;
    titulo: string;
    descricao: string;
    importancia: "POUCO_RELEVANTE" | "RELEVANTE" | "IMPORTANTE";
    status: "RASCUNHO" | "PUBLICADO";
    expira_em?: string | null;
    fixado_topo?: number | boolean;
    requer_confirmacao?: number | boolean;
    anexo_url?: string | null;
    anexo_tipo?: "NENHUM" | "IMAGEM" | "DOCUMENTO";
    confirmacoes_count?: number;
};

export type ListaComunicadosAdminResponse = {
    items: CommunicadoAdminItem[];
    total?: number;
    page?: number;
    pageSize?: number;
};

export type ComunicadoAdminPayload = {
    titulo: string;
    descricao: string;
    importancia: "POUCO_RELEVANTE" | "RELEVANTE" | "IMPORTANTE";
    fixado_topo?: boolean;
    status: "RASCUNHO" | "PUBLICADO";
    expira_em?: string; // dd/mm/aaaa (obrigatório se PUBLICADO)
    requer_confirmacao?: boolean;
    anexo_url?: string; // /uploads/... ou URL
    anexo_tipo?: "NENHUM" | "IMAGEM" | "DOCUMENTO";
};

export function listarComunicadosAdmin(
    params: { token: string; page: number; pageSize: number; status?: "RASCUNHO" | "PUBLICADO" },
    signal?: AbortSignal
) {
    const qs = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize)
    });
    if (params.status) qs.set("status", params.status);

    return httpGet<ListaComunicadosAdminResponse>(`/admin/comunicados?${qs.toString()}`, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export function obterComunicadoAdmin(params: { token: string; id: number }, signal?: AbortSignal) {
    return httpGet<ComunicadoAdminItem>(`/admin/comunicados/${params.id}`, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export function criarComunicadoAdmin(params: { token: string; body: ComunicadoAdminPayload }, signal?: AbortSignal) {
    return httpPost<ComunicadoAdminItem>(`/admin/comunicados`, params.body, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export function atualizarComunicadoAdmin(
    params: { token: string; id: number; body: ComunicadoAdminPayload },
    signal?: AbortSignal
) {
    return httpPut<ComunicadoAdminItem>(`/admin/comunicados/${params.id}`, params.body, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export function excluirComunicadoAdmin(params: { token: string; id: number }, signal?: AbortSignal) {
    return httpDelete<null>(`/admin/comunicados/${params.id}`, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export function confirmarLeituraColab(params: { token: string; id: number }, signal?: AbortSignal) {
    return httpPost<null>(`/colaborador/comunicados/${params.id}/confirmar-leitura`, {}, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export function obterConfirmacoesComunicadoAdmin(params: { token: string; id: number }, signal?: AbortSignal) {
    return httpGet<{ items: any[] }>(`/admin/comunicados/${params.id}/confirmacoes`, {
        signal,
        headers: bearerHeaders(params.token)
    });
}
