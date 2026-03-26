import "./SecaoEventos.css";
import { Calendar as IconCalendar, ChevronRight as IconChevron } from "lucide-react";
import { useEventos } from "../../hooks/useEventos";
import { EstadoCarregando } from "../Estados/EstadoCarregando";
import React from "react";

export function SecaoEventos() {
    const { eventoAtual, eventos, estado, erro } = useEventos();
    const [detalheAberto, setDetalheAberto] = React.useState<boolean>(false);
    const [eventoSelecionado, setEventoSelecionado] = React.useState<any>(null);

    const formatarData = (data: string) => {
        try {
            const d = new Date(data);
            return d.toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
            });
        } catch {
            return data;
        }
    };

    const formatarDataHora = (data: string) => {
        try {
            const d = new Date(data);
            return d.toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return data;
        }
    };

    return (
        <section className="secaoEventos">
            <div className="secaoEventos__container">
                <h2 className="secaoEventos__titulo">
                    <IconCalendar size={24} />
                    Eventos
                </h2>

                {estado === "carregando" && <EstadoCarregando />}

                {estado === "erro" && (
                    <div className="secaoEventos__mensagem">
                        <p className="secaoEventos__erro">{erro}</p>
                    </div>
                )}

                {estado === "pronto" && !eventoAtual && eventos.length === 0 && (
                    <div className="secaoEventos__mensagem">
                        <p className="secaoEventos__vazio">Nenhum evento no momento</p>
                    </div>
                )}

                {estado === "pronto" && (eventoAtual || eventos.length > 0) && (
                    <div className="secaoEventos__conteudo">
                        {/* EVENTO ATUAL OU PRÓXIMO */}
                        {eventoAtual && (
                            <div className="secaoEventos__destaque">
                                <div className="cartaoEventoDestaque">
                                    {eventoAtual.imagem_url && (
                                        <div className="cartaoEventoDestaque__imagem">
                                            <img
                                                src={eventoAtual.imagem_url}
                                                alt={eventoAtual.titulo}
                                                className="cartaoEventoDestaque__img"
                                            />
                                            <div className="cartaoEventoDestaque__badge">
                                                EM ANDAMENTO
                                            </div>
                                        </div>
                                    )}
                                    <div className="cartaoEventoDestaque__corpo">
                                        <h3 className="cartaoEventoDestaque__titulo">
                                            {eventoAtual.titulo}
                                        </h3>
                                        <p className="cartaoEventoDestaque__descricao">
                                            {eventoAtual.descricao}
                                        </p>
                                        <div className="cartaoEventoDestaque__meta">
                                            <span className="cartaoEventoDestaque__data">
                                                {formatarData(eventoAtual.data_inicio)} até{" "}
                                                {formatarData(eventoAtual.data_fim)}
                                            </span>
                                            {eventoAtual.local && (
                                                <span className="cartaoEventoDestaque__local">
                                                    📍 {eventoAtual.local}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* OUTROS EVENTOS */}
                        {eventos.length > 0 && (
                            <div className="secaoEventos__lista">
                                <h3 className="secaoEventos__subtitulo">Próximos Eventos</h3>
                                <div className="secaoEventos__grid">
                                    {eventos
                                        .filter((e) => !eventoAtual || e.id !== eventoAtual.id)
                                        .slice(0, 6)
                                        .map((evento) => (
                                            <button
                                                key={evento.id}
                                                type="button"
                                                className="cartaoEvento"
                                                onClick={() => {
                                                    setEventoSelecionado(evento);
                                                    setDetalheAberto(true);
                                                }}
                                            >
                                                {evento.imagem_url && (
                                                    <div className="cartaoEvento__imagem">
                                                        <img
                                                            src={evento.imagem_url}
                                                            alt={evento.titulo}
                                                            className="cartaoEvento__img"
                                                        />
                                                    </div>
                                                )}
                                                <div className="cartaoEvento__corpo">
                                                    <h4 className="cartaoEvento__titulo">
                                                        {evento.titulo}
                                                    </h4>
                                                    <p className="cartaoEvento__data">
                                                        {formatarData(evento.data_inicio)}
                                                    </p>
                                                </div>
                                                <div className="cartaoEvento__action">
                                                    <IconChevron size={20} />
                                                </div>
                                            </button>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL DE DETALHE */}
            {detalheAberto && eventoSelecionado && (
                <div className="secaoEventos__modalBackdrop" onClick={() => setDetalheAberto(false)}>
                    <div
                        className="secaoEventos__modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="secaoEventos__modalClose">
                            <button
                                type="button"
                                onClick={() => setDetalheAberto(false)}
                                aria-label="Fechar"
                            >
                                ✕
                            </button>
                        </div>

                        {eventoSelecionado.imagem_url && (
                            <img
                                src={eventoSelecionado.imagem_url}
                                alt={eventoSelecionado.titulo}
                                className="secaoEventos__modalImg"
                            />
                        )}

                        <div className="secaoEventos__modalConteudo">
                            {eventoSelecionado.foto_perfil && (
                                <div className="secaoEventos__modalAvatar">
                                    <img
                                        src={eventoSelecionado.foto_perfil}
                                        alt={eventoSelecionado.titulo}
                                        className="secaoEventos__modalAvatarImg"
                                    />
                                </div>
                            )}
                            <h3 className="secaoEventos__modalTitulo">
                                {eventoSelecionado.titulo}
                            </h3>
                            <p className="secaoEventos__modalDescricao">
                                {eventoSelecionado.descricao}
                            </p>

                            <div className="secaoEventos__modalMeta">
                                <div className="secaoEventos__modalItem">
                                    <span className="secaoEventos__modalLabel">Data:</span>
                                    <span className="secaoEventos__modalValor">
                                        {formatarDataHora(eventoSelecionado.data_inicio)} até{" "}
                                        {formatarDataHora(eventoSelecionado.data_fim)}
                                    </span>
                                </div>

                                {eventoSelecionado.local && (
                                    <div className="secaoEventos__modalItem">
                                        <span className="secaoEventos__modalLabel">Local:</span>
                                        <span className="secaoEventos__modalValor">
                                            {eventoSelecionado.local}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
