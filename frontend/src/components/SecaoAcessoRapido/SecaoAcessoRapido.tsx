import "./SecaoAcessoRapido.css";
import { ExternalLink as IconExternalLink } from "lucide-react";
import Logo_NFE from "../../assets/nfe_power.png";
import Logo_BI from "../../assets/QlickView_BI.png";
import Logo_ABR from "../../assets/icon-trackload.png";

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
        icone: Logo_ABR,
        descricao: "Rastreamento das NFs",
    },
    {
        id: "nfe-power",
        nome: "NF-e Power",
        url: "http://10.0.0.1:42801/smdLogin.asp",
        icone: Logo_NFE,
        descricao: "Gerenciamento de notas fiscais",
    },
    {
        id: "qlikview",
        nome: "QlikView - BI",
        url: "http://10.0.0.252/qlikview/index.htm",
        icone: Logo_BI,
        descricao: "Consulta de Dados",
    },
    {
        id: "varredor",
        nome: "Varredor Recursivo",
        url: "https://10.0.0.48:5175",
        icone: Logo_ABR,
        descricao: "Ajuste das NF de entrada",
    },
    {
        id: "catalogo-abr",
        nome: "Catálogo ABR",
        url: "https://abr-catalogo.vercel.app",
        icone: Logo_ABR,
        descricao: "Catálogo Web de produtos ",
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
                                    src={`${sistema.icone}`}
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
