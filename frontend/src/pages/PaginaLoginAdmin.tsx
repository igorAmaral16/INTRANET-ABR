import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../api/auth.api";
import { useSessaoAuth } from "../hooks/useSessaoAuth";
import "./PaginaBase.css";

export function PaginaLoginAdmin() {
    const navigate = useNavigate();
    const { estaLogadoAdmin, definirSessao, mensagemSessao, limparMensagemSessao } = useSessaoAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const acRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (estaLogadoAdmin) {
            navigate("/admin", { replace: true });
        }
    }, [estaLogadoAdmin, navigate]);

    useEffect(() => {
        // limpa mensagem “sessão expirou” quando o usuário começar um novo login
        return () => {
            acRef.current?.abort();
        };
    }, []);

    async function entrar(e: React.FormEvent) {
        e.preventDefault();

        acRef.current?.abort();
        const ac = new AbortController();
        acRef.current = ac;

        setCarregando(true);
        setErro(null);

        try {
            limparMensagemSessao();

            const resp = await loginAdmin({ username: username.trim(), password }, ac.signal);

            // importante: manter integridade com seu SessaoAuth
            definirSessao({
                token: resp.token,
                tokenType: resp.tokenType,
                expiresIn: resp.expiresIn,
                role: resp.role,
                user: resp.user
            } as any);

            navigate("/admin", { replace: true });
        } catch (e: any) {
            const msg = e?.message || "Não foi possível entrar.";
            setErro(msg);
        } finally {
            setCarregando(false);
        }
    }

    return (
        <div className="paginaBase">
            <main className="paginaBase__conteudo">
                <div className="card" style={{ maxWidth: 520, margin: "32px auto" }}>
                    <h1 style={{ marginBottom: 6 }}>Acesso Administrativo</h1>
                    <div style={{ opacity: 0.8, marginBottom: 16 }}>
                        Entre com seu usuário e senha de administração.
                    </div>

                    {mensagemSessao ? (
                        <div className="card cardErro" style={{ marginBottom: 12 }}>
                            {mensagemSessao}
                        </div>
                    ) : null}

                    {erro ? (
                        <div className="card cardErro" style={{ marginBottom: 12 }}>
                            {erro}
                        </div>
                    ) : null}

                    <form onSubmit={entrar} style={{ display: "grid", gap: 10 }}>
                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Usuário</span>
                            <input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                placeholder="ex: admin"
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <span>Senha</span>
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                type="password"
                            />
                        </label>

                        <button
                            type="submit"
                            className="barraTopo__botaoEntrar"
                            disabled={carregando}
                            style={{ width: "100%", marginTop: 6 }}
                        >
                            {carregando ? "Entrando..." : "Entrar"}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
