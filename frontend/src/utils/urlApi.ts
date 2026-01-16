export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:4000").replace(/\/$/, "");

export function resolverUrlApi(caminhoOuUrl: string) {
    const v = (caminhoOuUrl || "").trim();
    if (!v) return "";

    // já é URL absoluta
    if (/^https?:\/\//i.test(v)) return v;

    // caminho relativo vindo do backend: /uploads/...
    if (v.startsWith("/")) return `${API_BASE_URL}${v}`;

    // fallback
    return `${API_BASE_URL}/${v}`;
}

export function inferirTipoAnexoPorUrl(url: string) {
    const u = url.toLowerCase();
    if (u.endsWith(".png") || u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".webp") || u.endsWith(".gif")) {
        return "IMAGEM";
    }
    if (u.endsWith(".pdf")) return "DOCUMENTO";
    return "DESCONHECIDO";
}
