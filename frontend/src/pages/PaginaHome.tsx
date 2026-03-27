import "./PaginaHome.css";
import { SidebarFixed } from "../components/SidebarFixed/SidebarFixed";
import { Carousel } from "../components/Carousel/Carousel";
import { SecaoAcessoRapido } from "../components/SecaoAcessoRapido/SecaoAcessoRapido";
import { SecaoAniversariantes } from "../components/SecaoAniversariantes/SecaoAniversariantes";
import { SecaoEventos } from "../components/SecaoEventos/SecaoEventos";
import { SecaoMaisUtilizados } from "../components/SecaoMaisUtilizados/SecaoMaisUtilizados";
import { Modal } from "../components/Modal/Modal";
import { useSessaoAuth } from "../hooks/useSessaoAuth";
import { useNavigate } from "react-router-dom";
import { loginColaborador, loginAdmin } from "../api/auth.api";
import React, { useRef, useState } from "react";

export function PaginaHome() {
    const { sessao, definirSessao, sair } = useSessaoAuth();
    const navigate = useNavigate();

    const [loginAberto, setLoginAberto] = React.useState(false);
    const [tipoLogin, setTipoLogin] = useState<"COLAB" | "ADMIN" | null>(null);
    const [matricula, setMatricula] = useState("");
    const [usuario, setUsuario] = useState("");
    const [senha, setSenha] = useState("");
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const estaLogado = Boolean(sessao?.token);
    const role = sessao?.role as "COLAB" | "ADMIN" | null | undefined;

    const abrirLoginColab = () => {
        setTipoLogin("COLAB");
        setLoginAberto(true);
        setErro(null);
    };

    const abrirLoginAdmin = () => {
        setTipoLogin("ADMIN");
        setLoginAberto(true);
        setErro(null);
    };

    const fecharLogin = () => {
        setLoginAberto(false);
        setTipoLogin(null);
        setSenha("");
        setErro(null);
    };

    const submeterLogin = async () => {
        if (!tipoLogin) return;

        setErro(null);
        setCarregando(true);

        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        try {
            if (tipoLogin === "COLAB") {
                const resp = await loginColaborador(
                    { matricula: matricula.trim(), password: senha },
                    ac.signal
                );
                definirSessao({
                    token: resp.token,
                    role: resp.role as "COLAB" | "ADMIN",
                    user: resp.user,
                });
                fecharLogin();
                return;
            }

            const resp = await loginAdmin(
                { username: usuario.trim(), password: senha },
                ac.signal
            );
            definirSessao({
                token: resp.token,
                role: resp.role as "COLAB" | "ADMIN",
                user: resp.user,
            });
            fecharLogin();
            // Redirecionar admin para home do painel
            navigate("/admin/home", { replace: true });
        } catch (e: any) {
            if (e?.name === "AbortError") return;
            setErro(e?.message || "Não foi possível autenticar.");
        } finally {
            setCarregando(false);
        }
    };

    const telaLogin = !tipoLogin ? "seletor" : "formulario";

    return (
        <div className="paginaHome">
            {/* SIDEBAR FIXO */}
            <SidebarFixed
                estaLogado={estaLogado}
                role={role}
                aoIrParaHome={() => navigate("/")}
                aoMeuPerfil={() => navigate("/meu-perfil")}
                aoVerDocumentos={() => navigate("/documentos")}
                aoMeusDocumentos={() => navigate("/meus-documentos")}
                aoCalendario={() => navigate("/calendario")}
                aoFaq={() => navigate("/faq")}
                aoFaleComRh={() => navigate("/fale-com-rh")}
                aoComunicados={() => navigate("/comunicados")}
                aoAcessarPainel={() => navigate("/admin")}
                aoClicarEntrar={() => abrirLoginColab()}
                aoSair={() => {
                    sair();
                    navigate("/", { replace: true });
                }}
            />

            {/* CONTEÚDO PRINCIPAL */}
            <main className="paginaHome__main">
                {/* CARROSSEL NO TOPO */}
                <Carousel />

                {/* SEÇÕES */}
                <SecaoAcessoRapido />
                <SecaoMaisUtilizados role={role} />
                <SecaoAniversariantes token={sessao?.token} />
                <SecaoEventos />
            </main>

            {/* FOOTER */}
            <footer className="paginaHome__footer">
                <p className="paginaHome__footerTexto">
                    © 2026 ABR — Painel Administrativo. Todos os direitos reservados.
                </p>
            </footer>

            {/* MODAL LOGIN */}
            <Modal
                aberto={loginAberto}
                titulo={
                    telaLogin === "seletor"
                        ? "Como deseja entrar?"
                        : tipoLogin === "COLAB"
                            ? "Entrar como Colaborador"
                            : "Entrar no Painel Administrativo"
                }
                aoFechar={fecharLogin}
            >
                <div className="paginaHome__loginConteudo">
                    {telaLogin === "seletor" ? (
                        <>
                            <p className="paginaHome__loginDesc">
                                Selecione o tipo de acesso desejado:
                            </p>
                            <div className="paginaHome__loginBotoes">
                                <button
                                    type="button"
                                    className="paginaHome__loginBotao paginaHome__loginBotao--colab"
                                    onClick={abrirLoginColab}
                                >
                                    Sou Colaborador
                                </button>
                                <button
                                    type="button"
                                    className="paginaHome__loginBotao paginaHome__loginBotao--admin"
                                    onClick={abrirLoginAdmin}
                                >
                                    Sou Administrador
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="paginaHome__loginDesc">
                                {tipoLogin === "COLAB"
                                    ? "Use sua matrícula e senha para acessar."
                                    : "Use seu usuário e senha administrativos."}
                            </p>

                            {tipoLogin === "COLAB" ? (
                                <label className="paginaHome__loginCampo">
                                    Matrícula
                                    <input
                                        value={matricula}
                                        onChange={(e) => setMatricula(e.target.value)}
                                        placeholder="Ex.: MAT900"
                                        disabled={carregando}
                                    />
                                </label>
                            ) : (
                                <label className="paginaHome__loginCampo">
                                    Usuário
                                    <input
                                        value={usuario}
                                        onChange={(e) => setUsuario(e.target.value)}
                                        placeholder="Ex.: Admin"
                                        disabled={carregando}
                                    />
                                </label>
                            )}

                            <label className="paginaHome__loginCampo">
                                Senha
                                <input
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && senha.trim()) submeterLogin();
                                    }}
                                    placeholder="Digite sua senha"
                                    type="password"
                                    disabled={carregando}
                                />
                            </label>

                            {erro && (
                                <div className="paginaHome__loginErro" role="alert">
                                    {erro}
                                </div>
                            )}

                            <div className="paginaHome__loginAcoes">
                                <button
                                    type="button"
                                    className="paginaHome__loginSecundario"
                                    onClick={() => setTipoLogin(null)}
                                    disabled={carregando}
                                >
                                    Voltar
                                </button>
                                <button
                                    type="button"
                                    className="paginaHome__loginPrimario"
                                    onClick={submeterLogin}
                                    disabled={carregando || !senha.trim()}
                                >
                                    {carregando ? "Entrando..." : "Entrar"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
}
