import { httpGet } from "./clienteHttp";
import type { ComunicadoDetalhe, ListaComunicadosResponse } from "../tipos/comunicados";

export function listarComunicados(params: { page: number; pageSize: number }, signal?: AbortSignal) {
    const qs = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize)
    });
    return httpGet<ListaComunicadosResponse>(`/comunicados?${qs.toString()}`, { signal });
}

/**
 * Importante: este endpoint incrementa "views" no backend (pela instrumentação que você já fez).
 * Use ao abrir o comunicado.
 */
export function obterComunicado(id: number, signal?: AbortSignal) {
    return httpGet<ComunicadoDetalhe>(`/comunicados/${id}`, { signal });
}
