import { bearerHeaders, httpGet, httpPost, httpPut, httpDeleteJson } from "./clienteHttp";

export type PerfilColaborador = {
    id: number | string;
    matricula: string;
    nome_completo: string;
    data_nascimento: string; // ISO ou YYYY-MM-DD
    status: "ATIVO" | "INATIVO" | string;
};

function normalizarPerfil(data: any): PerfilColaborador {
    const src = data?.user || data;

    return {
        id: src?.id,
        matricula: String(src?.matricula || ""),
        nome_completo: String(src?.nome_completo || src?.nome || ""),
        data_nascimento: String(src?.data_nascimento || src?.nascimento || ""),
        status: String(src?.status || "")
    };
}

/* =========================
   COLAB: meu perfil
========================= */
export async function obterMeuPerfilColaborador(
    params: { token: string; userId?: string | number },
    signal?: AbortSignal
) {
    const headersObj = bearerHeaders(params.token);
    const headers = Object.fromEntries(Object.entries(headersObj).filter(([_, v]) => v !== undefined)) as
        | Record<string, string>
        | undefined;

    const candidatos = ["/colaborador/perfil"].filter(Boolean) as string[];

    let ultimoErro: any = null;

    for (const url of candidatos) {
        try {
            const data = await httpGet<any>(url, { signal, headers });
            return normalizarPerfil(data);
        } catch (e: any) {
            ultimoErro = e;
            continue;
        }
    }

    throw ultimoErro || new Error("Não foi possível carregar o perfil.");
}

/* =========================
   ADMIN: colaboradores
========================= */

export type ColaboradorAdmin = {
    matricula: string;
    nome_completo: string;
    data_nascimento: string; // backend espera dd/mm/aaaa no create/update; no retorno pode vir yyyy-mm-dd
    status: "ATIVO" | "INATIVO";
};

export type ListaColaboradoresAdminResponse = {
    items: ColaboradorAdmin[];
    total: number;
    page: number;
    pageSize: number;
};

export async function listarColaboradoresAdmin(
    params: { token: string; page: number; pageSize: number; status?: "ATIVO" | "INATIVO"; search?: string },
    signal?: AbortSignal
) {
    const qs = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize)
    });
    if (params.status) qs.set("status", params.status);
    if (params.search && params.search.trim()) qs.set("search", params.search.trim());

    return httpGet<ListaColaboradoresAdminResponse>(`/admin/colaboradores?${qs.toString()}`, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export async function obterColaboradorAdmin(
    params: { token: string; matricula: string },
    signal?: AbortSignal
) {
    return httpGet<ColaboradorAdmin>(`/admin/colaboradores/${encodeURIComponent(params.matricula)}`, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export async function criarColaboradorAdmin(
    params: { token: string; body: { matricula: string; nome_completo: string; data_nascimento: string; status?: "ATIVO" | "INATIVO" } },
    signal?: AbortSignal
) {
    return httpPost<ColaboradorAdmin>(`/admin/colaboradores`, params.body, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export async function atualizarColaboradorAdmin(
    params: { token: string; matricula: string; body: { nome_completo: string; data_nascimento: string; status: "ATIVO" | "INATIVO" } },
    signal?: AbortSignal
) {
    return httpPut<ColaboradorAdmin>(`/admin/colaboradores/${encodeURIComponent(params.matricula)}`, params.body, {
        signal,
        headers: bearerHeaders(params.token)
    });
}

export async function excluirColaboradorAdmin(
    params: { token: string; matricula: string; confirm: string },
    signal?: AbortSignal
) {
    return httpDeleteJson<void>(`/admin/colaboradores/${encodeURIComponent(params.matricula)}`, { confirm: params.confirm }, {
        signal,
        headers: bearerHeaders(params.token)
    });
}
