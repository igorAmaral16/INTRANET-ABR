import "./PaginaComunicados.css";
import { BarraTopo } from "../components/BarraTopo/BarraTopo";
import { CartaoComunicado } from "../components/CartaoComunicado/CartaoComunicado";
import { Modal } from "../components/Modal/Modal";
import { EstadoCarregando } from "../components/Estados/EstadoCarregando";
import { EstadoErro } from "../components/Estados/EstadoErro";
import { EstadoVazio } from "../components/Estados/EstadoVazio";
import { useComunicados } from "../hooks/useComunicados";
import { ModalLogin } from "../components/ModalLogin/ModalLogin";
import { ModalInfo } from "../components/ModalInfo/ModalInfo";
import { useSessaoAuth } from "../hooks/useSessaoAuth";
import { inferirTipoAnexoPorUrl, resolverUrlApi } from "../utils/urlApi";
import { useNavigate } from "react-router-dom";
import React from "react";

export function PaginaComunicados() {
    const {
        estado, erro, itens,
        busca, setBusca,
        filtroImportancia, setFiltroImportancia,
        recarregar,
        detalheAberto, detalheEstado, detalheErro,
        abrirDetalhe, fecharDetalhe
    } = useComunicados();

    const { estaLogadoColab, definirSessao, sair } = useSessaoAuth();

    const [loginColabAberto, setLoginColabAberto] = React.useState(false);
    const [loginAdminAberto, setLoginAdminAberto] = React.useState(false);
    const [infoEsqueciAberto, setInfoEsqueciAberto] = React.useState(false);
    const navigate = useNavigate();

    return (
        <div className="paginaComunicados">
            <BarraTopo
                busca={busca}
                aoMudarBusca={setBusca}
                mostrarBusca={true}
                estaLogadoColab={estaLogadoColab}
                aoClicarEntrar={() => setLoginColabAberto(true)}
                aoMeuPerfil={() => navigate("/meu-perfil")}
                aoVerDocumentos={() => navigate("/documentos")}
                aoFaq={() => navigate("/faq")}
                aoFaleComRh={() => navigate("/fale-com-rh")}
                aoSair={sair}
            />


            <main className="paginaComunicados__conteudo">
                <section className="paginaComunicados__cabecalho">
                    <div>
                        <h1 className="paginaComunicados__titulo">Comunicados</h1>
                        <p className="paginaComunicados__subtitulo">
                            Avisos e informações atualizadas do RH
                        </p>
                    </div>

                    <div className="paginaComunicados__filtros">
                        <label className="paginaComunicados__label">
                            Importância
                            <select
                                value={filtroImportancia}
                                onChange={(e) => setFiltroImportancia(e.target.value as any)}
                            >
                                <option value="TODOS">Todos</option>
                                <option value="IMPORTANTE">Importante!!</option>
                                <option value="RELEVANTE">Relevante</option>
                                <option value="POUCO_RELEVANTE">Pouco relevante</option>
                            </select>
                        </label>
                    </div>
                </section>

                {estado === "carregando" && <EstadoCarregando />}
                {estado === "erro" && <EstadoErro mensagem={erro || "Erro desconhecido."} aoTentarNovamente={recarregar} />}
                {estado === "pronto" && itens.length === 0 && <EstadoVazio />}

                {estado === "pronto" && itens.length > 0 && (
                    <section className="paginaComunicados__lista">
                        {itens.map((c) => (
                            <CartaoComunicado key={c.id} comunicado={c} aoAbrir={abrirDetalhe} />
                        ))}
                    </section>
                )}
            </main>

            <footer className="paginaComunicados__rodape">
                <button
                    type="button"
                    className="paginaComunicados__rodapeBotao"
                    onClick={() => setLoginAdminAberto(true)}
                    aria-label="Entrar no painel administrativo"
                >
                    Painel ADM — ABR {new Date().getFullYear()}
                </button>
            </footer>

            {/* Modal do detalhe (com anexo resolvido para API) */}
            <Modal
                aberto={Boolean(detalheAberto) || detalheEstado === "carregando" || detalheEstado === "erro"}
                titulo={detalheAberto?.titulo || "Comunicado"}
                aoFechar={fecharDetalhe}
            >
                {detalheEstado === "carregando" && <div>Carregando comunicado...</div>}
                {detalheEstado === "erro" && (
                    <div>
                        <p style={{ fontWeight: 800, marginTop: 0 }}>Não foi possível abrir</p>
                        <p style={{ opacity: 0.8 }}>{detalheErro}</p>
                        <button type="button" onClick={fecharDetalhe}>Fechar</button>
                    </div>
                )}
                {detalheEstado === "pronto" && detalheAberto && (
                    <div className="paginaComunicados__detalhe">
                        <div className="paginaComunicados__detalheMeta">
                            <span className="chip">{detalheAberto.importancia}</span>
                            {detalheAberto.expira_em ? <span className="meta">Expira: {detalheAberto.expira_em}</span> : null}
                            {detalheAberto.publicado_por_nome ? <span className="meta">Por: {detalheAberto.publicado_por_nome}</span> : null}
                        </div>

                        <p className="paginaComunicados__detalheTexto">{detalheAberto.descricao}</p>

                        {detalheAberto.anexo_url ? (() => {
                            const url = resolverUrlApi(detalheAberto.anexo_url);
                            const tipo = detalheAberto.anexo_tipo && detalheAberto.anexo_tipo !== "NENHUM"
                                ? detalheAberto.anexo_tipo
                                : inferirTipoAnexoPorUrl(url);

                            if (tipo === "IMAGEM") {
                                return (
                                    <>
                                        <a className="paginaComunicados__anexo" href={url} target="_blank" rel="noreferrer">
                                            Abrir imagem
                                        </a>
                                        <div className="paginaComunicados__previewImagem">
                                            <img src={url} alt="Anexo do comunicado" loading="lazy" />
                                        </div>
                                    </>
                                );
                            }

                            return (
                                <a className="paginaComunicados__anexo" href={url} target="_blank" rel="noreferrer">
                                    Abrir anexo
                                </a>
                            );
                        })() : null}
                    </div>
                )}
            </Modal>

            {/* Login COLAB */}
            <ModalLogin
                aberto={loginColabAberto}
                tipo="COLAB"
                aoFechar={() => setLoginColabAberto(false)}
                aoEsqueciSenha={() => setInfoEsqueciAberto(true)}
                aoSucesso={({ token, role, user }) => definirSessao({ token, role, user })}
            />

            {/* Login ADMIN */}
            <ModalLogin
                aberto={loginAdminAberto}
                tipo="ADMIN"
                aoFechar={() => setLoginAdminAberto(false)}
                aoEsqueciSenha={() => setInfoEsqueciAberto(true)}
                aoSucesso={({ token, role, user }) => {
                    definirSessao({ token, role, user });
                    alert("Login administrativo realizado. O painel ADM será implementado nas próximas telas.");
                }}
            />

            {/* Esqueci minha senha */}
            <ModalInfo
                aberto={infoEsqueciAberto}
                titulo="Recuperação de senha"
                mensagem="Para recuperar sua senha, procure o RH para validar seus dados e realizar a atualização."
                aoFechar={() => setInfoEsqueciAberto(false)}
            />
        </div>
    );
}
