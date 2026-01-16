export type Papel = "COLAB" | "ADMIN";

export type SessaoAuth = {
    token: string;
    role: Papel;
    user: any;
    createdAtIso: string;
};

const CHAVE = "intranet_sessao";

export function carregarSessao(): SessaoAuth | null {
    try {
        const raw = localStorage.getItem(CHAVE);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.token || !parsed?.role) return null;
        return parsed as SessaoAuth;
    } catch {
        return null;
    }
}

export function salvarSessao(sessao: SessaoAuth) {
    localStorage.setItem(CHAVE, JSON.stringify(sessao));
}

export function limparSessao() {
    localStorage.removeItem(CHAVE);
}
