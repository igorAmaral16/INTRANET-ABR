import "./SecaoAniversariantes.css";
import { Cake as IconCake } from "lucide-react";
import { useAniversariantesPublico } from "../../hooks/useAniversariantesPublico";
import { EstadoCarregando } from "../Estados/EstadoCarregando";

type Props = {
    token?: string;
};

export function SecaoAniversariantes({ token }: Props) {
    const { aniversariantes, carregando, erro } = useAniversariantesPublico();

    const mesNomes: Record<number, string> = {
        1: "Janeiro",
        2: "Fevereiro",
        3: "Março",
        4: "Abril",
        5: "Maio",
        6: "Junho",
        7: "Julho",
        8: "Agosto",
        9: "Setembro",
        10: "Outubro",
        11: "Novembro",
        12: "Dezembro",
    };

    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;

    return (
        <section className="secaoAniversariantes">
            <div className="secaoAniversariantes__container">
                <h2 className="secaoAniversariantes__titulo">
                    <IconCake size={24} />
                    Aniversariantes do Mês
                </h2>

                {carregando && <EstadoCarregando />}

                {erro && (
                    <div className="secaoAniversariantes__mensagem">
                        <p className="secaoAniversariantes__erro">{erro || "Erro ao carregar"}</p>
                    </div>
                )}

                {!carregando && !erro && aniversariantes.length === 0 && (
                    <div className="secaoAniversariantes__mensagem">
                        <p className="secaoAniversariantes__vazio">
                            Nenhum aniversariante em {mesNomes[mesAtual]}
                        </p>
                    </div>
                )}

                {!carregando && !erro && aniversariantes.length > 0 && (
                    <div className="secaoAniversariantes__lista">
                        {aniversariantes.map((aniversariante, idx) => (
                            <div key={idx} className="cartaoAniversariante">
                                <div className="cartaoAniversariante__data">
                                    {aniversariante.dia}
                                </div>
                                <div className="cartaoAniversariante__info">
                                    <h3 className="cartaoAniversariante__nome">
                                        {aniversariante.nome_completo}
                                    </h3>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
