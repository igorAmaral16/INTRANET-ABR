import "./PaginaComunicados.css";
import { BarraTopo } from "../components/BarraTopo/BarraTopo";
import { CartaoComunicado } from "../components/CartaoComunicado/CartaoComunicado";
import { Modal } from "../components/Modal/Modal";
import { EstadoCarregando } from "../components/Estados/EstadoCarregando";
import { EstadoErro } from "../components/Estados/EstadoErro";
import { EstadoVazio } from "../components/Estados/EstadoVazio";
import { useComunicados } from "../hooks/useComunicados";
import { inferirTipoAnexoPorUrl, resolverUrlApi } from "../utils/urlApi";

export function PaginaComunicados() {
    const {
        estado, erro, itens,
        busca, setBusca,
        filtroImportancia, setFiltroImportancia,
        recarregar,
        detalheAberto, detalheEstado, detalheErro,
        abrirDetalhe, fecharDetalhe
    } = useComunicados();

    return (
        <div className="paginaComunicados">
            <BarraTopo
                busca={busca}
                aoMudarBusca={setBusca}
                aoClicarEntrar={() => {
                    // Por enquanto, apenas navegação futura.
                    // Aqui você pode integrar react-router e enviar para /entrar.
                    alert("Tela de login será a próxima etapa.");
                }}
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
                <span>Painel {`—`} ABR {new Date().getFullYear()}</span>
            </footer>

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
                                            Abrir imagem em nova aba
                                        </a>

                                        <div className="paginaComunicados__previewImagem">
                                            <img src={url} alt="Anexo do comunicado" loading="lazy" />
                                        </div>
                                    </>
                                );
                            }

                            // PDF ou desconhecido: abrir/baixar
                            return (
                                <a className="paginaComunicados__anexo" href={url} target="_blank" rel="noreferrer">
                                    Abrir anexo
                                </a>
                            );
                        })() : null}

                    </div>
                )}
            </Modal>
        </div>
    );
}
