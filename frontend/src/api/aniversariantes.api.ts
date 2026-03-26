import { httpGet } from "./clienteHttp";

export type Aniversariante = {
    nome_completo: string;
    data_nascimento: string;
    dia: number;
};

/**
 * Rota pública - Lista aniversariantes do mês sem necessidade de autenticação
 */
export async function listarAniversariantesMes(signal?: AbortSignal): Promise<Aniversariante[]> {
    try {
        const data = await httpGet<{ aniversariantes: Aniversariante[] }>(
            "/aniversariantes",
            { signal }
        );
        return data.aniversariantes || [];
    } catch (erro) {
        console.error("Erro ao carregar aniversariantes:", erro);
        return [];
    }
}
