import "./SecaoEventos.css";
import { Calendar as IconCalendar, ChevronRight as IconChevron } from "lucide-react";
import { useEventos } from "../../hooks/useEventos";
import { EstadoCarregando } from "../Estados/EstadoCarregando";
import React from "react";

export function SecaoEventos() {
    const { eventos, estado, erro } = useEventos();
    const [detalheAberto, setDetalheAberto] = React.useState<boolean>(false);
    const [eventoSelecionado, setEventoSelecionado] = React.useState<any>(null);

    const formatarData = (data: string) => {
        try {
            const d = new Date(data);
            return d.toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
                year: "numeric",
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

                {estado === "pronto" && eventos.length === 0 && (
                    <div className="secaoEventos__mensagem">
                        <p className="secaoEventos__vazio">Nenhum evento no momento</p>
                    </div>
                )}

                {estado === "pronto" && eventos.length > 0 && (
                    <div className="secaoEventos__conteudo">
                        <div className="secaoEventos__lista">
                            <h3 className="secaoEventos__subtitulo">Outros Eventos</h3>
                            <div className="secaoEventos__grid">
                                {eventos.map((evento) => (
                                    <button
                                        key={evento.id}
                                        type="button"
                                        className="cartaoEvento"
                                        onClick={() => {
                                            setEventoSelecionado(evento);
                                            setDetalheAberto(true);
                                        }}
                                    >
                                        {evento.foto_perfil && (
                                            <div className="cartaoEvento__imagem">
                                                <img
                                                    src={evento.foto_perfil}
                                                    alt={evento.titulo}
                                                    className="cartaoEvento__img"
                                                />
                                            </div>
                                        )}
                                        <div className="cartaoEvento__corpo">
                                            <h4 className="cartaoEvento__titulo">
                                                {evento.titulo}
                                            </h4>
                                        </div>
                                        <div className="cartaoEvento__action">
                                            <IconChevron size={20} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
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

                        {eventoSelecionado.foto_perfil && (
                            <img
                                src={eventoSelecionado.foto_perfil}
                                alt={eventoSelecionado.titulo}
                                className="secaoEventos__modalImg"
                            />
                        )}

                        <div className="secaoEventos__modalConteudo">
                            <h3 className="secaoEventos__modalTitulo">
                                {eventoSelecionado.titulo}
                            </h3>

                            {eventoSelecionado.conteudo && (
                                <div
                                    className="secaoEventos__modalDescricao"
                                    dangerouslySetInnerHTML={{
                                        __html: eventoSelecionado.conteudo,
                                    }}
                                />
                            )}

                            {eventoSelecionado.publicado_em && (
                                <div className="secaoEventos__modalMeta">
                                    <span className="secaoEventos__modalLabel">📅 Data:</span>
                                    <span className="secaoEventos__modalValor">
                                        {formatarData(eventoSelecionado.publicado_em)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
