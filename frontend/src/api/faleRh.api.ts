import { bearerHeaders, httpGet, httpPost } from "./clienteHttp";

export type RhStatus = "PENDENTE" | "ABERTA" | "FECHADA";

export type RhCategoria =
    | "BENEFICIOS"
    | "FERIAS"
    | "PONTO"
    | "DOCUMENTOS"
    | "PAGAMENTO"
    | "OUTROS";

export type RhConversationListItem = {
    id: string; // UUID
    status: RhStatus;
    categoria: RhCategoria | string;
    assunto: string | null;
    created_at?: string;
    last_message_at?: string;

    colaborador_matricula?: string;
    colaborador_nome?: string | null;
};

export type RhMessage = {
    id: string; // UUID
    conversation_id: string; // UUID
    sender_role: "COLAB" | "ADMIN";
    sender_id?: number;
    tipo?: "PRESET" | "TEXTO";
    preset_key?: string | null;
    conteudo: string;
    created_at?: string;
};

export type RhConversationDetail = {
    conversation: RhConversationListItem & {
        colaborador_id?: number;
        assignee_admin_id?: number | null;
        accepted_at?: string | null;
        closed_by?: "COLAB" | "ADMIN" | null;
        closed_at?: string | null;
    };
    messages: RhMessage[];
};

/* =========================
   COLAB
========================= */

export type CriarConversaPayload = {
    categoria: RhCategoria;
    assunto?: string;
    mensagem: string;     // backend usa "mensagem" na criação
    preset_key?: string;  // opcional
};

export async function colabCriarConversa(
    params: { token: string; body: CriarConversaPayload },
    signal?: AbortSignal
) {
    return httpPost<RhConversationDetail>(
        "/colaborador/fale-rh/conversas",
        params.body,
        { signal, headers: bearerHeaders(params.token) }
    );
}

export async function colabListarConversas(params: { token: string }, signal?: AbortSignal) {
    return httpGet<{ items: RhConversationListItem[]; total: number }>(
        "/colaborador/fale-rh/conversas",
        { signal, headers: bearerHeaders(params.token) }
    );
}

export async function colabObterConversa(params: { token: string; id: string }, signal?: AbortSignal) {
    return httpGet<RhConversationDetail>(
        `/colaborador/fale-rh/conversas/${params.id}`,
        { signal, headers: bearerHeaders(params.token) }
    );
}

export type EnviarMensagemPayload = {
    conteudo: string;               // padrão definitivo
    tipo?: "PRESET" | "TEXTO";
    preset_key?: string | null;
};

export async function colabEnviarMensagem(
    params: { token: string; id: string; body: EnviarMensagemPayload },
    signal?: AbortSignal
) {
    return httpPost<void>(
        `/colaborador/fale-rh/conversas/${params.id}/mensagens`,
        params.body,
        { signal, headers: bearerHeaders(params.token) }
    );
}

export async function colabFecharConversa(params: { token: string; id: string }, signal?: AbortSignal) {
    return httpPost<void>(
        `/colaborador/fale-rh/conversas/${params.id}/fechar`,
        {},
        { signal, headers: bearerHeaders(params.token) }
    );
}

/* =========================
   ADMIN
========================= */

export async function adminListarConversas(
    params: { token: string; status?: RhStatus },
    signal?: AbortSignal
) {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);

    const url = qs.toString()
        ? `/admin/fale-rh/conversas?${qs.toString()}`
        : "/admin/fale-rh/conversas";

    return httpGet<{ items: RhConversationListItem[]; total: number }>(
        url,
        { signal, headers: bearerHeaders(params.token) }
    );
}

export async function adminObterConversa(params: { token: string; id: string }, signal?: AbortSignal) {
    return httpGet<RhConversationDetail>(
        `/admin/fale-rh/conversas/${params.id}`,
        { signal, headers: bearerHeaders(params.token) }
    );
}

export async function adminAceitarConversa(params: { token: string; id: string }, signal?: AbortSignal) {
    return httpPost<void>(
        `/admin/fale-rh/conversas/${params.id}/aceitar`,
        {},
        { signal, headers: bearerHeaders(params.token) }
    );
}

export async function adminEnviarMensagem(
    params: { token: string; id: string; body: EnviarMensagemPayload },
    signal?: AbortSignal
) {
    return httpPost<void>(
        `/admin/fale-rh/conversas/${params.id}/mensagens`,
        params.body,
        { signal, headers: bearerHeaders(params.token) }
    );
}

export async function adminFecharConversa(params: { token: string; id: string }, signal?: AbortSignal) {
    return httpPost<void>(
        `/admin/fale-rh/conversas/${params.id}/fechar`,
        {},
        { signal, headers: bearerHeaders(params.token) }
    );
}
