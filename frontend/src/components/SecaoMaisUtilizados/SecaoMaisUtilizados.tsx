import "./SecaoMaisUtilizados.css";
import { useNavigate } from "react-router-dom";
import {
    Video as IconVideo,
    Calendar as IconCalendar,
    FolderOpen as IconFolder,
    Bell as IconBell,
} from "lucide-react";

type Props = {
    role?: "COLAB" | "ADMIN" | null;
};

export function SecaoMaisUtilizados({ role }: Props) {
    const navigate = useNavigate();

    const opcoes = [
        {
            id: "tutoriais",
            titulo: "Tutoriais",
            descricao: "Aprenda como usar o sistema",
            icon: <IconVideo size={24} />,
            onClick: () => {
                if (role === "ADMIN") {
                    window.location.href = "/admin/tutoriais";
                } else {
                    navigate("/tutoriais");
                }
            },
            cor: "azul",
        },
        {
            id: "calendario",
            titulo: "Calendário",
            descricao: "Veja feriados e datas importantes",
            icon: <IconCalendar size={24} />,
            onClick: () => navigate("/calendario"),
            cor: "verde",
        },
        {
            id: "documentos",
            titulo: "Documentos",
            descricao: "Acesse documentos da empresa",
            icon: <IconFolder size={24} />,
            onClick: () => navigate("/documentos"),
            cor: "laranja",
        },
        {
            id: "comunicados",
            titulo: "Comunicados",
            descricao: "Veja as últimas notícias",
            icon: <IconBell size={24} />,
            onClick: () => navigate("/comunicados"),
            cor: "vermelho",
        },
    ];

    return (
        <section className="secaoMaisUtilizados">
            <div className="secaoMaisUtilizados__container">
                <h2 className="secaoMaisUtilizados__titulo">Mais Utilizados</h2>
                <p className="secaoMaisUtilizados__subtitulo">
                    Acesso rápido às principais funcionalidades
                </p>

                <div className="secaoMaisUtilizados__grid">
                    {opcoes.map((opcao) => (
                        <button
                            key={opcao.id}
                            type="button"
                            className={`cartaoMaisUtilizado cartaoMaisUtilizado--${opcao.cor}`}
                            onClick={opcao.onClick}
                        >
                            <div className="cartaoMaisUtilizado__icone">
                                {opcao.icon}
                            </div>
                            <h3 className="cartaoMaisUtilizado__titulo">{opcao.titulo}</h3>
                            <p className="cartaoMaisUtilizado__descricao">{opcao.descricao}</p>
                            <div className="cartaoMaisUtilizado__arrow">→</div>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
