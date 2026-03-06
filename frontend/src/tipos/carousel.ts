export interface CarouselItemResumo {
    id: number;
    titulo: string;
    imagem_url?: string | null;
    publicado_em?: string | null;
}

export interface CarouselItemDetalhe extends CarouselItemResumo {
    conteudo: string;
    status?: "PUBLICADO" | "RASCUNHO";
    publicado_por_nome?: string | null;
    publicado_por_admin_id?: number | null;
    created_at?: string;
    updated_at?: string;
}
