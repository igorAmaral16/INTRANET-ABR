import { httpGet, bearerHeaders, httpPost, httpPut, httpDelete } from "./clienteHttp";
import type { CarouselItemResumo, CarouselItemDetalhe } from "../tipos/carousel";

// re-export types
export type { CarouselItemResumo, CarouselItemDetalhe };

// público - lista de slides
export function listarCarrossel() {
    return httpGet<CarouselItemResumo[]>(`/carousel`);
}

export function listarEventos() {
    return httpGet<CarouselItemDetalhe[]>(`/carousel/eventos`);
}

export function obterCarrossel(id: number, signal?: AbortSignal) {
    return httpGet<CarouselItemDetalhe>(`/carousel/${id}`, { signal });
}

// admin (não usado atualmente na UI, mas disponível)
export function listarCarrosselAdmin(token?: string) {
    const headers = bearerHeaders(token);
    return httpGet<CarouselItemResumo[]>(`/admin/carousel`, { headers });
}

export function criarCarrossel(params: {
    token: string;
    body: Partial<CarouselItemDetalhe>;
}) {
    const headers = bearerHeaders(params.token);
    return httpPost<CarouselItemDetalhe>(`/admin/carousel`, params.body, { headers });
}

export function atualizarCarrossel(params: {
    token: string;
    id: number;
    body: Partial<CarouselItemDetalhe>;
}) {
    const headers = bearerHeaders(params.token);
    return httpPut<CarouselItemDetalhe>(`/admin/carousel/${params.id}`, params.body, { headers });
}

export function deletarCarrossel(id: number, token: string) {
    const headers = bearerHeaders(token);
    return httpDelete(`/admin/carousel/${id}`, { headers });
}
