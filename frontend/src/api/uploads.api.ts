import { bearerHeaders, httpPostFormData } from "./clienteHttp";

export type UploadResponse = {
    url: string; // ex: /uploads/announcements/<arquivo>
    type: "IMAGEM" | "DOCUMENTO" | "NENHUM";
    size: number;
    mime: string;
};

export function uploadAnexoAdmin(params: { token: string; file: File }, signal?: AbortSignal) {
    const form = new FormData();
    form.append("file", params.file);

    return httpPostFormData<UploadResponse>("/admin/uploads", form, {
        signal,
        headers: bearerHeaders(params.token),
        timeoutMs: 60000
    });
}
