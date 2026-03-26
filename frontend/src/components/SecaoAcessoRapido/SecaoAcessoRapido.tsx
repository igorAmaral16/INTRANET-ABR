import "./SecaoAcessoRapido.css";
import { ExternalLink as IconExternalLink } from "lucide-react";

type SistemaExterno = {
    id: string;
    nome: string;
    url: string;
    icone: string;
    descricao?: string;
};

const SISTEMAS_EXTERNOS: SistemaExterno[] = [
    {
        id: "trackload",
        nome: "Trackload",
        url: "https://10.0.0.48:5173",
        icone: "icon-trackload.png",
        descricao: "Sistema de rastreamento",
    },
    {
        id: "nfe-power",
        nome: "NF-e Power",
        url: "http://10.0.0.1:42801/smdLogin.asp",
        icone: "icon-nfe-power.png",
        descricao: "Gerenciamento de notas fiscais",
    },
    {
        id: "qlikview",
        nome: "QlikView",
        url: "http://10.0.0.252/qlikview/index.htm",
        icone: "icon-qlikview.png",
        descricao: "Business Intelligence",
    },
    {
        id: "varredor",
        nome: "Varredor de Arquivos",
        url: "https://10.0.0.48:5175",
        icone: "icon-varredor.png",
        descricao: "Gerenciamento de arquivos",
    },
    {
        id: "catalogo-abr",
        nome: "Catálogo ABR",
        url: "https://abr-catalogo.vercel.app",
        icone: "icon-catalogo-abr.png",
        descricao: "Catálogo de produtos",
    },
];

export function SecaoAcessoRapido() {
    const handleClickSistema = (url: string) => {
        window.open(url, "_blank", "noopener,noreferrer");
    };

    return (
        <section className="secaoAcessoRapido">
            <div className="secaoAcessoRapido__container">
                <h2 className="secaoAcessoRapido__titulo">Acesso Rápido</h2>
                <p className="secaoAcessoRapido__subtitulo">
                    Acesse rapidamente os sistemas integrados da empresa
                </p>

                <div className="secaoAcessoRapido__grid">
                    {SISTEMAS_EXTERNOS.map((sistema) => (
                        <button
                            key={sistema.id}
                            type="button"
                            className="cartaoAcessoRapido"
                            onClick={() => handleClickSistema(sistema.url)}
                            title={sistema.descricao || sistema.nome}
                        >
                            <div className="cartaoAcessoRapido__icone">
                                <img
                                    src={`/assets/${sistema.icone}`}
                                    alt=""
                                    className="cartaoAcessoRapido__img"
                                    onError={(e) => {
                                        // Fallback se a imagem não existir
                                        (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                />
                            </div>
                            <h3 className="cartaoAcessoRapido__nome">{sistema.nome}</h3>
                            <p className="cartaoAcessoRapido__descricao">{sistema.descricao}</p>
                            <div className="cartaoAcessoRapido__badge">
                                <IconExternalLink size={14} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
