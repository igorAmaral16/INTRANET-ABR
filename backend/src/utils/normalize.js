export function normalizeFolderName(name) {
    if (typeof name !== "string") return null;
    const trimmed = name.trim().toUpperCase();

    // Permite A-Z, 0-9, espaço, underscore e hífen
    if (!/^[A-Z0-9 _-]{3,120}$/.test(trimmed)) return null;

    // Evita múltiplos espaços
    return trimmed.replace(/\s+/g, " ");
}

export function normalizeDocName(name) {
    if (typeof name !== "string") return null;
    const trimmed = name.trim().toUpperCase();

    // Nome do documento: permite A-Z0-9 espaço _ - . (ponto para versões)
    if (!/^[A-Z0-9 _\-.]{3,160}$/.test(trimmed)) return null;

    return trimmed.replace(/\s+/g, " ");
}

export function toSlug(upperName) {
    // Slug previsível: espaços -> '-', remove sequências inválidas
    return upperName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_\.]/g, "")
        .replace(/-+/g, "-");
}
