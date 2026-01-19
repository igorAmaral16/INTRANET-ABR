import { bearerHeaders, httpPostDownloadBlob } from "./clienteHttp";

export function baixarBlobComoArquivo(blob: Blob, filename: string) {
    const a = document.createElement("a");
    const href = URL.createObjectURL(blob);
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
}

export async function gerarRelatorioAdmin(params: { token: string; from?: string; to?: string }, signal?: AbortSignal) {
    const qs = new URLSearchParams();
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);

    const url = qs.toString() ? `/admin/relatorios?${qs.toString()}` : "/admin/relatorios";
    return httpPostDownloadBlob(url, {}, {
        signal,
        headers: bearerHeaders(params.token),
        timeoutMs: 60000
    });
}
