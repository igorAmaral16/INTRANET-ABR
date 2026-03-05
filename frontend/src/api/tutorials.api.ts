import { httpGet, bearerHeaders } from "./clienteHttp";

import type { TutorialResumo } from "../tipos/tutorials";
// re-export for convenience
export type { TutorialResumo };

// público
export function listarTutoriais(setor: string) {
    const qs = new URLSearchParams({ setor });
    return httpGet<TutorialResumo[]>(`/tutorials?${qs.toString()}`);
}

// admin (requires token)
export function listarTutoriaisAdmin(setor: string, token?: string) {
    const qs = new URLSearchParams({ setor });
    const headers = bearerHeaders(token);
    return httpGet<TutorialResumo[]>(`/admin/tutorials?${qs.toString()}`, { headers });
}

// admin
export interface TutorialPayload {
    titulo: string;
    descricao: string;
    setor: string;
    data_publicacao: string; // dd/mm/aaaa
}

export async function criarTutorial(params: { token: string; body: TutorialPayload; file: File }) {
    const form = new FormData();
    form.append("titulo", params.body.titulo);
    form.append("descricao", params.body.descricao);
    form.append("setor", params.body.setor);
    form.append("data_publicacao", params.body.data_publicacao);
    form.append("file", params.file);

    // httpPost helper does not support FormData so we fallback to fetch
    const resp = await fetch(`/admin/tutorials`, {
        method: "POST",
        body: form,
        headers: { ...bearerHeaders(params.token) }
    });
    if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err?.error?.message || "Falha ao criar tutorial");
    }
    return resp.json();
}
