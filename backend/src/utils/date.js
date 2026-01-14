export function parseDdMmYyyyToDate(value) {
    if (typeof value !== "string") return null;

    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
    if (!m) return null;

    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);

    if (yyyy < 1900 || yyyy > 2100) return null;
    if (mm < 1 || mm > 12) return null;
    if (dd < 1 || dd > 31) return null;

    // Validação real de calendário
    const d = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (
        d.getUTCFullYear() !== yyyy ||
        d.getUTCMonth() !== mm - 1 ||
        d.getUTCDate() !== dd
    ) {
        return null;
    }

    // Retorna string no padrão MySQL DATE
    const month = String(mm).padStart(2, "0");
    const day = String(dd).padStart(2, "0");
    return `${yyyy}-${month}-${day}`;
}
