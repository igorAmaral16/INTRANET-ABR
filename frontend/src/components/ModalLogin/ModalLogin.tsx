import { useEffect, useMemo, useRef, useState } from "react";
import { loginAdmin, loginColaborador } from "../../api/auth.api";
import { Modal } from "../Modal/Modal";
import "./ModalLogin.css";

type TipoLogin = "COLAB" | "ADMIN";

type Props = {
    aberto: boolean;
    tipo: TipoLogin;
    aoFechar: () => void;
    aoSucesso: (payload: { token: string; role: "COLAB" | "ADMIN"; user: any }) => void;
    aoEsqueciSenha: () => void;
};

export function ModalLogin({ aberto, tipo, aoFechar, aoSucesso, aoEsqueciSenha }: Props) {
    const titulo = useMemo(() => (tipo === "COLAB" ? "Entrar como Colaborador" : "Entrar no Painel Administrativo"), [tipo]);

    const [matricula, setMatricula] = useState("");
    const [usuario, setUsuario] = useState("");
    const [senha, setSenha] = useState("");

    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!aberto) return;
        setErro(null);
        setCarregando(false);
        setSenha("");
        // não limpa matricula/usuario para UX (usuário pode reabrir)
        return () => abortRef.current?.abort();
    }, [aberto]);

    async function submeter() {
        setErro(null);
        setCarregando(true);

        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        try {
            if (tipo === "COLAB") {
                const resp = await loginColaborador({ matricula: matricula.trim(), password: senha }, ac.signal);
                aoSucesso({ token: resp.token, role: resp.role, user: resp.user });
                aoFechar();
                return;
            }

            const resp = await loginAdmin({ username: usuario.trim(), password: senha }, ac.signal);
            aoSucesso({ token: resp.token, role: resp.role, user: resp.user });
            aoFechar();
        } catch (e: any) {
            if (e?.name === "AbortError") return;
            setErro(e?.message || "Não foi possível autenticar.");
        } finally {
            setCarregando(false);
        }
    }

    const podeEnviar = useMemo(() => {
        if (carregando) return false;
        if (!senha.trim()) return false;
        if (tipo === "COLAB") return Boolean(matricula.trim());
        return Boolean(usuario.trim());
    }, [carregando, senha, tipo, matricula, usuario]);

    return (
        <Modal aberto={aberto} titulo={titulo} aoFechar={aoFechar}>
            <div className="modalLogin">
                <p className="modalLogin__descricao">
                    {tipo === "COLAB"
                        ? "Use sua matrícula e senha para acessar o menu do colaborador."
                        : "Use seu usuário e senha administrativos para acessar o painel ADM."}
                </p>

                {tipo === "COLAB" ? (
                    <label className="modalLogin__campo">
                        Matrícula
                        <input
                            value={matricula}
                            onChange={(e) => setMatricula(e.target.value)}
                            placeholder="Ex.: MAT900"
                            autoComplete="username"
                        />
                    </label>
                ) : (
                    <label className="modalLogin__campo">
                        Usuário
                        <input
                            value={usuario}
                            onChange={(e) => setUsuario(e.target.value)}
                            placeholder="Ex.: MaraRH"
                            autoComplete="username"
                        />
                    </label>
                )}

                <label className="modalLogin__campo">
                    Senha
                    <input
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="Digite sua senha"
                        type="password"
                        autoComplete="current-password"
                    />
                </label>

                {erro ? <div className="modalLogin__erro" role="alert">{erro}</div> : null}

                <div className="modalLogin__acoes">
                    <button className="modalLogin__secundario" type="button" onClick={aoEsqueciSenha} disabled={carregando}>
                        Esqueci minha senha
                    </button>

                    <button className="modalLogin__primario" type="button" onClick={submeter} disabled={!podeEnviar}>
                        {carregando ? <span className="modalLogin__spinner" aria-label="Carregando" /> : "Entrar"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
