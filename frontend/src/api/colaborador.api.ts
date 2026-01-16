import { bearerHeaders, httpGet } from "./clienteHttp";

export type PerfilColaborador = {
    id: number | string;
    matricula: string;
    nome_completo: string;
    data_nascimento: string; // ISO ou YYYY-MM-DD
    status: "ATIVO" | "INATIVO" | string;
};

function normalizarPerfil(data: any): PerfilColaborador {
    // suporta respostas { user: ... } ou direto
    const src = data?.user || data;

    return {
        id: src?.id,
        matricula: String(src?.matricula || ""),
        nome_completo: String(src?.nome_completo || src?.nome || ""),
        data_nascimento: String(src?.data_nascimento || src?.nascimento || ""),
        status: String(src?.status || "")
    };
}

export async function obterMeuPerfilColaborador(params: { token: string; userId?: string | number }, signal?: AbortSignal) {
    const headersObj = bearerHeaders(params.token);
    const headers = Object.fromEntries(Object.entries(headersObj).filter(([_, v]) => v !== undefined)) as Record<string, string> | undefined;

    // Ordem de tentativa: endpoints típicos para painel colaborador
    const candidatos = [
        "/colaborador/perfil"
    ].filter(Boolean) as string[];

    let ultimoErro: any = null;

    for (const url of candidatos) {
        try {
            const data = await httpGet<any>(url, { signal, headers });
            return normalizarPerfil(data);
        } catch (e: any) {
            ultimoErro = e;
            // tenta o próximo
            continue;
        }
    }

    throw ultimoErro || new Error("Não foi possível carregar o perfil.");
}
