export type Importancia = "POUCO_RELEVANTE" | "RELEVANTE" | "IMPORTANTE";

export interface ComunicadoResumo {
    id: number;
    titulo: string;
    importancia: Importancia;
    fixado_topo: number | boolean;
    requer_confirmacao?: number | boolean;
    expira_em?: string | null;
    anexo_url?: string | null;
    anexo_tipo?: "NENHUM" | "IMAGEM" | "DOCUMENTO";
    publicado_por_nome?: string | null;
    confirmacoes_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface ListaComunicadosResponse {
    total: number;
    page: number;
    pageSize: number;
    items: ComunicadoResumo[];
}

export interface ComunicadoDetalhe extends ComunicadoResumo {
    descricao: string;
    confirmacoes_count?: number;
    confirmed_by_me?: boolean;
}

export interface ConfirmacaoComunicado {
    id: number;
    comunicado_id: number;
    colaborador_id: number;
    colaborador_nome: string;
    confirmed_at: string;
}
