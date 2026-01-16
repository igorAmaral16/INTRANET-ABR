import { httpPost } from "./clienteHttp";

type LoginColabReq = { matricula: string; password: string };
type LoginAdminReq = { username: string; password: string };

type LoginResponse = {
    token: string;
    tokenType: "Bearer";
    expiresIn: string; // ex: "60m"
    role: "COLAB" | "ADMIN";
    user: any;
};

export function loginColaborador(body: LoginColabReq, signal?: AbortSignal) {
    return httpPost<LoginResponse>("/auth/colaborador/login", body, { signal });
}

export function loginAdmin(body: LoginAdminReq, signal?: AbortSignal) {
    return httpPost<LoginResponse>("/auth/admin/login", body, { signal });
}
