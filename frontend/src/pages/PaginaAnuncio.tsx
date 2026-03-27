import "./PaginaAnuncio.css";
import { useParams, useNavigate } from "react-router-dom";
import { SidebarFixed } from "../components/SidebarFixed/SidebarFixed";
import { BotaoVoltar } from "../components/BotaoVoltar/BotaoVoltar";
import { EstadoCarregando } from "../components/Estados/EstadoCarregando";
import { EstadoErro } from "../components/Estados/EstadoErro";
import { useCarouselItem } from "../hooks/useCarousel";
import { useSessaoAuth } from "../hooks/useSessaoAuth";
import { resolverUrlApi } from "../utils/urlApi";
import "../styles/imageDisplay.css";

export function PaginaAnuncio() {
    const { id } = useParams();
    const numericId = id ? Number(id) : undefined;
    const { sessao, sair } = useSessaoAuth();
    const { estado, erro, item } = useCarouselItem(numericId);
    const navigate = useNavigate();

    const estaLogado = Boolean(sessao?.token);
    const role = sessao?.role;

    function cleanHtml(html: string) {
        if (!html) return html;
        return html
            .replace(/<\s*html[^>]*>/gi, "")
            .replace(/<\s*\/\s*html>/gi, "")
            .replace(/<\s*head[^>]*>[\s\S]*?<\s*\/\s*head>/gi, "")
            .replace(/<\s*body[^>]*>/gi, "")
            .replace(/<\s*\/\s*body>/gi, "")
            .trim();
    }

    function formatDate(value: string) {
        try {
            const d = new Date(value);
            if (isNaN(d.getTime())) return value;
            const dd = String(d.getDate()).padStart(2, "0");
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const yyyy = d.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
        } catch {
            return value;
        }
    }

    return (
        <div className="paginaAnuncio">
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
                aoClicarEntrar={() => navigate("/")}
                aoSair={() => {
                    sair();
                    navigate("/", { replace: true });
                }}
            />

            <main className="paginaAnuncio__conteudo">
                <BotaoVoltar destino="/" />
                {estado === "carregando" && <EstadoCarregando />}
                {estado === "erro" && <EstadoErro mensagem={erro || "Erro"} aoTentarNovamente={() => { }} />}
                {estado === "pronto" && item && (
                    <article className="paginaAnuncio__artigo">
                        {item.imagem_url && (
                            <div className="paginaAnuncio__hero announcementCard__imageWrapper">
                                <img
                                    src={resolverUrlApi(item.imagem_url)}
                                    alt={item.titulo}
                                    className="announcementCard__image"
                                    loading="lazy"
                                />
                            </div>
                        )}
                        <h1 className="paginaAnuncio__titulo">{item.titulo}</h1>
                        <div className="paginaAnuncio__meta">
                            {item.publicado_por_nome && (
                                <span>Por <strong>{item.publicado_por_nome}</strong></span>
                            )}
                            {item.publicado_em && (
                                <span>• {formatDate(item.publicado_em)}</span>
                            )}
                        </div>
                        <div
                            className="paginaAnuncio__corpo"
                            dangerouslySetInnerHTML={{ __html: cleanHtml(item.conteudo) }}
                        />
                    </article>
                )}
            </main>
        </div>
    );
}
