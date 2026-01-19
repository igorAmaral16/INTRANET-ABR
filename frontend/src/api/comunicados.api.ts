import { bearerHeaders, httpDelete, httpGet, httpPost, httpPut } from "./clienteHttp";
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

/**
 * Importante: este endpoint incrementa "views" no backend.
 */
export function obterComunicado(id: number, signal?: AbortSignal) {
    return httpGet<ComunicadoDetalhe>(`/comunicados/${id}`, { signal });
}

/* =========================
   ADMIN
========================= */

export function listarComunicadosAdmin(
    params: { token: string; status?: "RASCUNHO" | "PUBLICADO"; page?: number; pageSize?: number },
    signal?: AbortSignal
) {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    qs.set("page", String(params.page ?? 1));
    qs.set("pageSize", String(params.pageSize ?? 20));

    return httpGet<ListaComunicadosResponse>(`/admin/comunicados?${qs.toString()}`, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export function obterComunicadoAdmin(params: { token: string; id: number }, signal?: AbortSignal) {
    return httpGet<ComunicadoDetalhe>(`/admin/comunicados/${params.id}`, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export type ComunicadoAdminPayload = {
    titulo: string;
    descricao: string;
    importancia: "POUCO_RELEVANTE" | "RELEVANTE" | "IMPORTANTE";
    fixado_topo?: boolean;
    status: "RASCUNHO" | "PUBLICADO";
    expira_em?: string; // dd/mm/aaaa (se PUBLICADO obrigatório no backend)
    anexo_url?: string;
    anexo_tipo?: "NENHUM" | "IMAGEM" | "DOCUMENTO";
};

export function criarComunicadoAdmin(params: { token: string; body: ComunicadoAdminPayload }, signal?: AbortSignal) {
    return httpPost<ComunicadoDetalhe>(`/admin/comunicados`, params.body, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export function atualizarComunicadoAdmin(
    params: { token: string; id: number; body: ComunicadoAdminPayload },
    signal?: AbortSignal
) {
    return httpPut<ComunicadoDetalhe>(`/admin/comunicados/${params.id}`, params.body, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export function excluirComunicadoAdmin(params: { token: string; id: number }, signal?: AbortSignal) {
    return httpDelete<void>(`/admin/comunicados/${params.id}`, {
        signal,
        headers: bearerHeaders(params.token)
    });
}
